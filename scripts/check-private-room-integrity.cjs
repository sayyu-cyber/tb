// Focused client contract tests. No browser, database, secrets or network required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lib/rooms.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function harness({ row = null, rpcResult = { data: null, error: null }, matchResult = 'match-id', readError = null } = {}) {
  const calls = [];
  const client = {
    from(table) {
      calls.push({ table });
      return {
        select(columns) {
          calls.push({ columns });
          return {
            eq(column, value) {
              calls.push({ column, value });
              return { async maybeSingle() { return { data: row, error: readError }; } };
            },
          };
        },
      };
    },
    async rpc(name, args) {
      calls.push({ name, args: JSON.parse(JSON.stringify(args)) });
      return rpcResult;
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === '@/lib/supabase/client') return { getSupabaseBrowserClient: () => client };
      if (name === '@/lib/supabase/data') return { toMillis: value => new Date(value).getTime() };
      if (name === '@/lib/matchCommand') return {
        async invokeMatchCommand(command) {
          calls.push({ command: JSON.parse(JSON.stringify(command)) });
          if (matchResult instanceof Error) throw matchResult;
          return matchResult;
        },
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename: 'lib/rooms.ts' });
  return { rooms: exports, calls };
}

test('room reads whitelist public fields and expose only a boolean password marker', async () => {
  for (const marker of [true, false, undefined]) {
    const { rooms, calls } = harness({ row: {
      code: 'ABC123', has_password: marker, password_hash: 'must-never-escape',
      created_at: '2026-10-01T00:00:00Z', room_players: [
        { user_id: 'b', seat_index: 1, display_name: 'B' },
        { user_id: 'a', seat_index: 0, display_name: 'A' },
      ],
    } });
    const room = await rooms.getRoom(' abc123 ');
    assert.equal(room.password, marker === true);
    assert.equal(JSON.stringify(room).includes('must-never-escape'), false);
    assert.equal(room.players.join(','), 'a,b');
    const selection = calls.find(call => call.columns).columns;
    assert.ok(selection.includes('has_password'));
    assert.doesNotMatch(selection, /\*|password_hash/);
    assert.deepEqual(calls.at(-1), { column: 'code', value: 'ABC123' });
  }
});

test('room reads preserve not-found and propagate query failures', async () => {
  assert.equal(await harness().rooms.getRoom('NONE'), null);
  const error = new Error('read denied');
  await assert.rejects(harness({ readError: error }).rooms.getRoom('NONE'), /read denied/);
});

test('password display uses translated on/off labels for hosts and guests on desktop and phone', () => {
  const filename = path.join(root, 'components/game/RoomWaitingRoom.tsx');
  const sourceFile = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const displayNames = new Set(['passwordText', 'passwordDetail', 'passwordLabel']);
  const declarations = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && displayNames.has(node.name.text)) {
      declarations.push(`const ${node.getText(sourceFile)};`);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  assert.equal(declarations.length, 3, 'Locate the actual lobby display expressions');
  const labels = { room_passwordOn: 'Password on', room_passwordOff: 'Password off', room_on: 'On', room_off: 'Off', room_password: 'Password' };
  for (const password of [true, false]) for (const isOwner of [true, false]) for (const phone of [true, false]) {
    const [detail, label] = vm.runInNewContext(`${declarations.join('\n')}\n[passwordDetail, passwordLabel]`, {
      room: { password }, isOwner, phone, t: key => labels[key],
    });
    assert.equal(detail, password ? 'On' : 'Off');
    assert.equal(label, password ? 'Password on' : 'Password off');
    assert.doesNotMatch(`${detail} ${label}`, /true|false/);
  }
});

test('creation is one RPC with no caller-supplied owner, seat, capacity or expiry', async () => {
  const { rooms, calls } = harness({ rpcResult: { data: 'ABC123', error: null } });
  assert.equal(await rooms.createRoom('forged-uid', 'forged-name', 'mindi', 'secret', 'casual', 'ffa1v1'), 'ABC123');
  assert.deepEqual(calls, [{ name: 'create_room', args: {
    p_game_type: 'mindi', p_password: 'secret', p_mode: 'casual', p_mindi_mode: 'ffa1v1',
  } }]);
  await assert.rejects(harness().rooms.createRoom('a', 'A', 'mindi', null), /room code/);
  await assert.rejects(harness({ rpcResult: { error: { message: 'Activate a room card' } } }).rooms.createRoom('a', 'A', 'mindi', null), /Activate a room card/);
});

test('join preserves invite parameters and converts persisted-rate-limit errors into failures', async () => {
  const { rooms, calls } = harness({ rpcResult: { data: { ok: true }, error: null } });
  await rooms.joinRoom(' abc123 ', 'forged-uid', 'forged-name', 'secret', 'invite-id');
  assert.deepEqual(calls, [{ name: 'join_room', args: { p_code: 'ABC123', p_password: 'secret', p_invite: 'invite-id' } }]);
  for (const message of ['Incorrect room password', 'Too many room join attempts', 'This invite has expired']) {
    const h = harness({ rpcResult: { data: { error: message }, error: null } });
    await assert.rejects(h.rooms.joinRoom('ABC123', 'a', 'A', ''), error => error.message === message);
  }
  await assert.rejects(harness({ rpcResult: { error: { message: 'permanent account required' } } }).rooms.joinRoom('ABC123', 'a', 'A', ''), /permanent account/);
  await assert.rejects(harness().rooms.joinRoom('ABC123', 'a', 'A', ''), /confirm your seat/);
});

test('seat reorder is one server command and reports authorization/validation errors', async () => {
  const { rooms, calls } = harness();
  await rooms.setSeatOrder(' abc123 ', 'forged-owner', ['b', 'a']);
  assert.deepEqual(calls, [{ name: 'set_room_seat_order', args: { p_code: 'ABC123', p_seat_order: ['b', 'a'] } }]);
  await assert.rejects(harness({ rpcResult: { error: { message: 'Only the room owner' } } }).rooms.setSeatOrder('ABC123', 'a', []), /Only the room owner/);
});

test('leave, close, kick and ban use atomic RPCs and surface failed writes', async () => {
  const cases = [
    ['leaveRoom', [' abc123 ', 'a'], 'leave_room', { p_code: 'ABC123', p_close: false }],
    ['closeRoom', [' abc123 ', 'a'], 'leave_room', { p_code: 'ABC123', p_close: true }],
    ['kickPlayer', [' abc123 ', 'a', 'b'], 'remove_room_player', { p_code: 'ABC123', p_target: 'b', p_ban: false }],
    ['banPlayer', [' abc123 ', 'a', 'b'], 'remove_room_player', { p_code: 'ABC123', p_target: 'b', p_ban: true }],
  ];
  for (const [method, args, name, expected] of cases) {
    const { rooms, calls } = harness();
    await rooms[method](...args);
    assert.deepEqual(calls, [{ name, args: expected }]);
    await assert.rejects(harness({ rpcResult: { error: { message: 'write failed' } } }).rooms[method](...args), /write failed/);
  }
});

test('start uses the trusted command only and never calls a client initial-state builder', async () => {
  const { rooms, calls } = harness();
  assert.equal(await rooms.startRoomMatch(' abc123 ', 'forged-owner', () => { throw new Error('Client state builder was invoked'); }), 'match-id');
  assert.deepEqual(calls, [{ command: { type: 'start-room', code: 'ABC123' } }]);
  for (const value of [null, '', 42, {}]) {
    await assert.rejects(harness({ matchResult: value }).rooms.startRoomMatch('ABC123'), /could not start/);
  }
  await assert.rejects(harness({ matchResult: new Error('Only the host') }).rooms.startRoomMatch('ABC123'), /Only the host/);
});
