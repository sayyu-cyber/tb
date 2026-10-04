/* Focused trusted-game regressions. No browser, network, .env or credentials.
 * node scripts/check-match-authority.cjs
 * node scripts/check-match-authority.cjs --db
 * --db uses ONLY a disposable database in local thaasbai-audit-db.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const previousHook = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
  });
  module._compile(outputText, filename);
};
const authority = require('../server/matchAuthority.ts');
const { createMatchHandler } = require('../server/matchCommandHandler.ts');
const mindi = require('../lib/mindiEngine.ts');
const gin = require('../lib/ginRummyEngine.ts');
if (previousHook) require.extensions['.ts'] = previousHook;
else delete require.extensions['.ts'];

const players = [1, 2, 3, 4].map(n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
const matchId = '20000000-0000-4000-8000-000000000001';
const outsider = '10000000-0000-4000-8000-000000000099';
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function random(seed = 42) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function table(game = 'gin_rummy', count = 2, seed = 42) {
  const seated = players.slice(0, count);
  return { game, players: seated, state: authority.createState(game, seated, random(seed)), deadline: 100000, completed: false };
}
function cardsOf(match) {
  const s = match.state;
  return match.game === 'mindi' ? Object.values(s.handsByUid).flat().concat(s.trick.map(p => p.card))
    : Object.values(s.hands).flat().concat(s.stock, s.discard);
}
const cardKey = c => `${c.suit}${c.rank}`;
function uniqueCards(cards, count) {
  assert.equal(cards.length, count);
  assert.equal(new Set(cards.map(cardKey)).size, count, 'Duplicate or missing card');
}
function rejectedUnchanged(match, actor, move, time, pattern) {
  const before = structuredClone(match);
  assert.throws(() => authority.applyMove(match, actor, move, time, random()), pattern);
  assert.deepEqual(match, before, 'Rejected move mutated authority state');
}

test('Deal shape, unique cards, opening leader and participant counts over 60 seeded deals', () => {
  for (const [game, count] of [['gin_rummy', 2], ['mindi', 2], ['mindi', 4]]) {
    for (let seed = 1; seed <= 20; seed++) {
      const m = table(game, count, seed);
      uniqueCards(cardsOf(m), 52);
      assert.ok(m.players.includes(authority.activePlayer(m)));
      const hands = game === 'mindi' ? m.state.handsByUid : m.state.hands;
      assert.deepEqual(Object.keys(hands), m.players);
      for (const hand of Object.values(hands)) {
        assert.equal(hand.length, game === 'mindi' ? 52 / count : 10);
        assert.ok(hand.every(c => ['S', 'H', 'D', 'C'].includes(c.suit) && c.rank >= (game === 'mindi' ? 2 : 1) && c.rank <= (game === 'mindi' ? 14 : 13)));
      }
      if (game === 'gin_rummy') { assert.equal(m.state.stock.length, 31); assert.equal(m.state.discard.length, 1); }
      assert.deepEqual(authority.winners(m), []);
    }
  }
  for (const ids of [[], [players[0]], players.slice(0, 3), [players[0], players[0]]]) {
    assert.throws(() => authority.createState('mindi', ids, random()), /configuration/);
  }
  assert.throws(() => authority.createState('gin_rummy', players, random()), /configuration/);
});

test('Active projections redact all other hands and Gin stock, with only own private hand', () => {
  for (const [game, count] of [['mindi', 4], ['mindi', 2], ['gin_rummy', 2]]) {
    const m = table(game, count);
    const before = structuredClone(m);
    const projection = authority.projectMatch(m);
    const handField = game === 'mindi' ? 'handsByUid' : 'hands';
    assert.deepEqual(projection.publicState[handField], {});
    assert.deepEqual(Object.keys(projection.privateStates), m.players);
    for (const uid of m.players) {
      assert.deepEqual(projection.privateStates[uid], { hand: m.state[handField][uid] });
      assert.equal(projection.publicState.handCounts[uid], m.state[handField][uid].length);
    }
    if (game === 'gin_rummy') { assert.deepEqual(projection.publicState.stock, []); assert.equal(projection.publicState.stockCount, 31); }
    assert.equal(projection.publicState.turnDeadline, m.deadline);
    assert.deepEqual(m, before);
  }
});

test('Both games reject nonparticipants, out-of-turn, expired, early timeout and completed moves', () => {
  for (const game of ['mindi', 'gin_rummy']) {
    const m = table(game);
    const actor = authority.activePlayer(m);
    const other = m.players.find(p => p !== actor);
    const move = game === 'mindi' ? { type: 'play', card: m.state.handsByUid[actor][0] } : { type: 'draw', source: 'stock' };
    for (const attempted of [move, { type: 'timeout' }, { type: 'forfeit' }]) rejectedUnchanged(m, outsider, attempted, m.deadline, /not a player/);
    rejectedUnchanged(m, other, move, 1, /not your turn/);
    rejectedUnchanged(m, actor, move, m.deadline, /expired/);
    rejectedUnchanged(m, other, { type: 'timeout' }, m.deadline - 1, /not expired/);
    m.completed = true;
    rejectedUnchanged(m, actor, { type: 'forfeit' }, 1, /finished/);
  }
});

test('Gin draw/discard legality, conservation, immutable state, duplicate draw/discard rejection', () => {
  for (const source of ['stock', 'discard']) {
    const m = table();
    const actor = authority.activePlayer(m);
    const before = structuredClone(m);
    rejectedUnchanged(m, actor, { type: 'discard', card: m.state.hands[actor][0] }, 1, /Draw before/);
    const drawn = authority.applyMove(m, actor, { type: 'draw', source }, 1, random());
    assert.deepEqual(m, before);
    assert.equal(drawn.state.hands[actor].length, 11);
    assert.equal(drawn.state.phase, 'discard');
    assert.equal(drawn.deadline, m.deadline, 'Drawing must not reset the whole-turn deadline');
    uniqueCards(cardsOf(drawn), 52);
    rejectedUnchanged(drawn, actor, { type: 'draw', source }, 2, /Discard before/);
    rejectedUnchanged(drawn, actor, { type: 'discard', card: { suit: 'S', rank: 99 } }, 2, /not in your hand/);
    const next = authority.applyMove(drawn, actor, { type: 'discard', card: drawn.state.hands[actor][0] }, 2, random());
    assert.equal(next.state.hands[actor].length, 10);
    assert.equal(next.state.turn, m.players.find(p => p !== actor));
    assert.equal(next.state.phase, 'draw');
    assert.equal(next.deadline, 2 + gin.TURN_SECONDS * 1000);
    uniqueCards(cardsOf(next), 52);
    rejectedUnchanged(next, actor, { type: 'discard', card: drawn.state.hands[actor][0] }, 3, /not your turn/);
  }
});

test('Gin timeout from either participant handles draw and discard phases identically', () => {
  for (const phase of ['draw', 'discard']) {
    let m = table();
    const actor = authority.activePlayer(m);
    if (phase === 'discard') m = authority.applyMove(m, actor, { type: 'draw', source: 'stock' }, 1, random());
    const results = m.players.map(uid => authority.applyMove(m, uid, { type: 'timeout' }, m.deadline, random(71)));
    assert.deepEqual(results[0], results[1]);
    assert.equal(results[0].state.hands[actor].length, 10);
    assert.equal(results[0].state.phase, 'draw');
    assert.notEqual(results[0].state.turn, actor);
    assert.equal(results[0].deadline, m.deadline + gin.TURN_SECONDS * 1000);
    uniqueCards(cardsOf(results[0]), 52);
  }
});

test('Gin stock refill preserves top discard and all 52 unique cards', () => {
  const m = table();
  m.state.discard.push(...m.state.stock.splice(0));
  const top = structuredClone(m.state.discard.at(-1));
  const next = authority.applyMove(m, authority.activePlayer(m), { type: 'draw', source: 'stock' }, 1, random());
  assert.deepEqual(next.state.discard, [top]);
  assert.equal(next.state.reshuffles, 1);
  uniqueCards(cardsOf(next), 52);
  const empty = table();
  empty.state.discard = [];
  rejectedUnchanged(empty, authority.activePlayer(empty), { type: 'draw', source: 'discard' }, 1, /empty/);
});

test('Gin wins only with 4+3+3, reveals completed hands but never stock', () => {
  const m = table();
  const actor = authority.activePlayer(m);
  const other = m.players.find(p => p !== actor);
  const hand = [...[1, 2, 3, 4].map(rank => ({ suit: 'S', rank })), ...[2, 3, 4].map(rank => ({ suit: 'H', rank })), ...['S', 'H', 'D'].map(suit => ({ suit, rank: 8 }))];
  m.state.hands[actor] = hand.concat({ suit: 'C', rank: 13 });
  m.state.hands[other] = [{ suit: 'C', rank: 1 }, { suit: 'D', rank: 11 }];
  m.state.phase = 'discard';
  const win = authority.applyMove(m, actor, { type: 'discard', card: { suit: 'C', rank: 13 } }, 1, random());
  assert.equal(win.completed, true);
  assert.deepEqual(authority.winners(win), [actor]);
  assert.deepEqual(win.state.result.layout.map(meld => meld.length).sort(), [3, 3, 4]);
  assert.equal(win.state.result.loserDeadwood, 11);
  const projected = authority.projectMatch(win).publicState;
  assert.deepEqual(projected.hands, win.state.hands);
  assert.deepEqual(projected.stock, []);
  assert.equal(projected.turnDeadline, null);
  m.state.hands[actor] = ['S', 'H'].flatMap(suit => [1, 2, 3, 4, 5].map(rank => ({ suit, rank }))).concat({ suit: 'C', rank: 13 });
  const noWin = authority.applyMove(m, actor, { type: 'discard', card: { suit: 'C', rank: 13 } }, 1, random());
  assert.equal(noWin.completed, false, '5+5 must not end the app-specific game');
});

test('Mindi follows suit, rejects duplicate card play and sets trump on first void', () => {
  const m = table('mindi', 4);
  m.state.turnSeat = 0;
  m.state.trick = [{ seat: 3, card: { suit: 'S', rank: 4 } }];
  m.state.handsByUid[players[0]] = [{ suit: 'S', rank: 2 }, { suit: 'H', rank: 14 }];
  rejectedUnchanged(m, players[0], { type: 'play', card: { suit: 'H', rank: 14 } }, 1, /cannot be played/);
  const next = authority.applyMove(m, players[0], { type: 'play', card: { suit: 'S', rank: 2 } }, 1, random());
  assert.equal(next.state.trumpSuit, null);
  rejectedUnchanged(next, players[0], { type: 'play', card: { suit: 'S', rank: 2 } }, 2, /not your turn/);
  next.state.turnSeat = 0;
  rejectedUnchanged(next, players[0], { type: 'play', card: { suit: 'S', rank: 2 } }, 2, /cannot be played/);
  const trump = authority.applyMove(next, players[0], { type: 'play', card: { suit: 'H', rank: 14 } }, 2, random());
  assert.equal(trump.state.trumpSuit, 'H');
});

test('Mindi complete 2/4-player games including timeout requests from every seat', () => {
  for (const count of [2, 4]) for (let seed = 1; seed <= 8; seed++) {
    let m = table('mindi', count, seed);
    let moves = 0;
    const played = new Set();
    while (!m.completed && moves < 53) {
      const actor = authority.activePlayer(m);
      const hand = m.state.handsByUid[actor];
      const legal = mindi.getLegalPlays(hand, m.state.trick[0]?.card.suit ?? null);
      const card = legal[0];
      const before = structuredClone(m);
      const timeout = moves % 3 === 0;
      m = authority.applyMove(m, timeout ? m.players[moves % count] : actor,
        timeout ? { type: 'timeout' } : { type: 'play', card }, timeout ? m.deadline : m.deadline - 1, random(seed));
      assert.equal(played.has(cardKey(card)), false);
      played.add(cardKey(card));
      assert.equal(before.state.handsByUid[actor].length, m.state.handsByUid[actor].length + 1);
      moves++;
      assert.equal(Object.values(m.state.handsByUid).flat().length + played.size, 52);
      if (moves < 52) assert.equal(m.completed, false, 'Mindi must play every card');
    }
    assert.equal(moves, 52);
    assert.equal(played.size, 52);
    assert.equal(m.state.tricksPlayed, 52 / count);
    assert.equal(m.state.tensCaptured.A + m.state.tensCaptured.B, 4);
    assert.equal(m.state.tricksWon.A + m.state.tricksWon.B, 52 / count);
    assert.equal(m.state.tenCaptures.length, 4);
    const expectedTeam = m.state.tensCaptured.A === m.state.tensCaptured.B
      ? (m.state.tricksWon.A >= m.state.tricksWon.B ? 'A' : 'B') : (m.state.tensCaptured.A > m.state.tensCaptured.B ? 'A' : 'B');
    assert.equal(m.state.outcome.winner, expectedTeam);
    assert.deepEqual(authority.winners(m), m.players.filter((_, seat) => (seat % 2 === 0 ? 'A' : 'B') === expectedTeam));
    assert.equal(authority.projectMatch(m).publicState.turnDeadline, null);
  }
});

test('Forfeit is available to either Gin player and all Mindi seats; opponents win', () => {
  for (const [game, count] of [['gin_rummy', 2], ['mindi', 2], ['mindi', 4]]) for (let seat = 0; seat < count; seat++) {
    const m = table(game, count);
    const done = authority.applyMove(m, m.players[seat], { type: 'forfeit' }, m.deadline + 1, random());
    assert.equal(done.completed, true);
    assert.deepEqual(authority.winners(done), m.players.filter((_, i) => game === 'gin_rummy' ? i !== seat : i % 2 !== seat % 2));
    rejectedUnchanged(done, m.players[seat], { type: 'forfeit' }, 1, /finished/);
  }
});

function mockServer(options = {}) {
  const calls = [];
  let current = { ...table(), revision: 0, deadline: Date.now() + 60000 };
  if (options.current) current = structuredClone(options.current);
  const uid = options.uid ?? authority.activePlayer(current);
  const fetchMock = async (url, init) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : undefined });
    if (url.endsWith('/auth/v1/user')) {
      assert.equal(init.headers.Authorization, 'Bearer TEST_USER_TOKEN');
      return Response.json(options.user ?? { id: uid, is_anonymous: false }, { status: options.authStatus ?? 200 });
    }
    const name = url.split('/').at(-1);
    assert.equal(init.headers.Authorization, 'Bearer TEST_SERVICE_KEY');
    if (options.rpcError) return Response.json(options.rpcError, { status: 400 });
    if (name === 'authority_load') return Response.json(current);
    if (name === 'authority_commit') {
      if (options.race) return Response.json(false);
      const body = JSON.parse(init.body);
      assert.equal(body.p_actor, uid);
      assert.equal(body.p_revision, current.revision);
      current = { ...current, state: body.p_state, deadline: body.p_deadline, revision: current.revision + 1, completed: body.p_winners.length > 0 };
      return Response.json(true);
    }
    if (name === 'authority_candidates') return Response.json(options.candidate ?? null);
    if (name === 'authority_start') return Response.json(matchId);
    throw new Error(`Unexpected RPC: ${name}`);
  };
  const handler = createMatchHandler({ url: 'https://local-test.invalid', serviceKey: 'TEST_SERVICE_KEY', origins: ['https://game.invalid'] }, fetchMock);
  return { calls, uid, current: () => current, send: (body, extra = {}) => handler(new Request('https://game.invalid/match-command', {
    method: 'POST', headers: { Authorization: 'Bearer TEST_USER_TOKEN', 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body), ...extra,
  })) };
}
const moveCommand = move => ({ type: 'move', matchId, revision: 0, move });
test('HTTP auth rejects missing/invalid JWT and anonymous account before any game RPC', async () => {
  for (const [options, extra, status] of [[{}, { headers: {} }, 401], [{ authStatus: 401 }, {}, 401], [{ user: { id: players[0], is_anonymous: true } }, {}, 403], [{ user: { id: 'not-a-uuid' } }, {}, 403]]) {
    const s = mockServer(options);
    assert.equal((await s.send(moveCommand({ type: 'forfeit' }), extra)).status, status);
    assert.equal(s.calls.filter(c => c.url.includes('/rpc/')).length, 0);
  }
});

test('HTTP rejects unknown commands and malformed shape/card/source/revision without loading state', async () => {
  const invalid = [null, [], 4, {}, { type: 'replace-state', p_state: {} }, { ...moveCommand({ type: 'forfeit' }), revision: -1 },
    { ...moveCommand({ type: 'forfeit' }), revision: 0.5 }, { ...moveCommand({ type: 'forfeit' }), revision: Number.MAX_SAFE_INTEGER + 1 },
    { ...moveCommand({ type: 'forfeit' }), matchId: 'bad' }, moveCommand(null), moveCommand({ type: 'unknown' }),
    moveCommand({ type: 'draw', source: 'opponent' }), moveCommand({ type: 'play' }), moveCommand({ type: 'discard', card: { suit: 'X', rank: 2 } }),
    moveCommand({ type: 'play', card: { suit: 'S', rank: 1.2 } }), { type: 'form', game: 'chess', pool: 'casual' },
    { type: 'form', game: 'mindi', pool: 'bad' }, { type: 'start-room', code: '../BAD' }, { type: 'form', game: 'mindi', pool: 'casual', party: [] }, '{'];
  for (const command of invalid) {
    const s = mockServer();
    const response = await s.send(command);
    assert.equal(response.status, 400, JSON.stringify(command));
    assert.equal(s.calls.filter(c => c.url.includes('/rpc/')).length, 0);
  }
  const s = mockServer();
  assert.equal((await s.send(' '.repeat(4097))).status, 413);
});

test('HTTP origin/method and preflight controls', async () => {
  const s = mockServer();
  assert.equal((await s.send({}, { method: 'GET', body: undefined })).status, 405);
  assert.equal((await s.send({}, { headers: { Origin: 'https://attacker.invalid' } })).status, 403);
  const preflight = await s.send({}, { method: 'OPTIONS', body: undefined, headers: { Origin: 'https://game.invalid' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://game.invalid');
  assert.equal(s.calls.length, 0);
});

test('HTTP ignores forged actor, winners, p_state and public/private state; persists only computed move', async () => {
  const s = mockServer();
  const before = structuredClone(s.current());
  const response = await s.send({ ...moveCommand({ type: 'draw', source: 'stock' }), actor: outsider, p_actor: outsider,
    p_state: { forged: true }, state: { forged: true }, p_public: { forged: true }, p_private: { forged: true }, p_winners: [outsider] });
  assert.equal(response.status, 200);
  const committed = s.calls.find(c => c.url.endsWith('/authority_commit')).body;
  assert.equal(committed.p_actor, s.uid);
  assert.equal(committed.p_state.hands[s.uid].length, 11);
  assert.deepEqual(committed.p_state.hands[before.players.find(p => p !== s.uid)], before.state.hands[before.players.find(p => p !== s.uid)]);
  assert.deepEqual(committed.p_winners, []);
  assert.deepEqual(committed.p_public.hands, {});
  assert.deepEqual(committed.p_public.stock, []);
  assert.equal(JSON.stringify(committed).includes('forged'), false);
});

test('HTTP rejects duplicate revision, losing CAS race and nonparticipant moves without a second commit', async () => {
  const s = mockServer();
  const command = moveCommand({ type: 'draw', source: 'stock' });
  assert.equal((await s.send(command)).status, 200);
  assert.equal((await s.send(command)).status, 409);
  assert.equal(s.calls.filter(c => c.url.endsWith('/authority_commit')).length, 1);
  const race = mockServer({ race: true });
  assert.equal((await race.send(command)).status, 409);
  const other = mockServer({ uid: outsider });
  assert.equal((await other.send(command)).status, 400);
  assert.equal(other.calls.filter(c => c.url.endsWith('/authority_commit')).length, 0);
});

test('HTTP either participant can expire Gin turns and winners derive from server forfeit', async () => {
  for (const uid of players.slice(0, 2)) {
    const current = { ...table(), revision: 0, deadline: Date.now() - 1 };
    const s = mockServer({ uid, current });
    assert.equal((await s.send(moveCommand({ type: 'timeout' }))).status, 200);
    assert.notEqual(s.current().state.turn, current.state.turn);
    const forfeited = mockServer({ uid });
    assert.equal((await forfeited.send(moveCommand({ type: 'forfeit' }))).status, 200);
    assert.deepEqual(forfeited.calls.find(c => c.url.endsWith('/authority_commit')).body.p_winners, players.slice(0, 2).filter(p => p !== uid));
  }
});

test('HTTP illegal moves never commit or disclose hands, and valid moves return only acknowledgement', async () => {
  for (const game of ['mindi', 'gin_rummy']) {
    const current = { ...table(game), revision: 0, deadline: Date.now() + 60000 };
    const actor = authority.activePlayer(current);
    const other = current.players.find(uid => uid !== actor);
    const legal = game === 'mindi' ? { type: 'play', card: current.state.handsByUid[actor][0] } : { type: 'draw', source: 'stock' };
    const illegal = game === 'mindi' ? { type: 'play', card: { suit: 'S', rank: 99 } } : { type: 'discard', card: current.state.hands[actor][0] };
    for (const [uid, move, override] of [[other, legal, {}], [actor, illegal, {}],
      [actor, { type: 'timeout' }, {}], [actor, legal, { deadline: Date.now() - 1 }],
      [actor, { type: 'forfeit' }, { completed: true }]]) {
      const s = mockServer({ uid, current: { ...current, ...override } });
      const before = structuredClone(s.current());
      const response = await s.send(moveCommand(move));
      assert.equal(response.status, 400);
      assert.deepEqual(Object.keys(await response.json()), ['error']);
      assert.equal(s.calls.filter(c => c.url.endsWith('/authority_commit')).length, 0);
      assert.deepEqual(s.current(), before);
    }
    const s = mockServer({ uid: actor, current });
    const response = await s.send(moveCommand(legal));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { result: true });
  }
});

test('HTTP form generates trusted deals/private recipients; empty queue and split Gin duo shape', async () => {
  const empty = mockServer();
  assert.deepEqual(await (await empty.send({ type: 'form', game: 'mindi', pool: 'casual' })).json(), { result: null });
  for (const [game, count] of [['mindi', 4], ['gin_rummy', 2], ['gin_rummy', 4]]) {
    const candidate = { game, pool: 'casual', players: players.slice(0, count), room: null, party: null };
    const s = mockServer({ candidate });
    const response = await s.send({ type: 'form', game, pool: 'casual', state: { forged: true }, p_tables: [] });
    assert.equal(response.status, 200);
    const args = s.calls.find(c => c.url.endsWith('/authority_start')).body;
    assert.equal(args.p_tables.length, game === 'gin_rummy' && count === 4 ? 2 : 1);
    assert.deepEqual(args.p_tables.flatMap(t => t.players), candidate.players);
    for (const t of args.p_tables) {
      assert.deepEqual(Object.keys(t.privateStates), t.players);
      assert.deepEqual(t.publicState[game === 'mindi' ? 'handsByUid' : 'hands'], {});
      uniqueCards(cardsOf({ game, state: t.state }), 52);
    }
    assert.equal(JSON.stringify(args).includes('forged'), false);
  }
});

async function runDatabase() {
  const { bootstrap, isLocalDocker } = require('./check-integrity-db.cjs');
  if (process.env.DOCKER_HOST && !isLocalDocker(process.env.DOCKER_HOST)) throw new Error('Nonlocal Docker host refused');
  const docker = (args, input) => {
    const result = spawnSync('docker', args, { input, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout);
    return result.stdout.trim();
  };
  const context = docker(['context', 'show']);
  const endpoint = JSON.parse(docker(['context', 'inspect', context, '--format', '{{json .Endpoints.docker.Host}}']));
  assert.ok(isLocalDocker(endpoint), 'Local Docker socket required');
  const prefix = ['--context', context];
  const container = 'thaasbai-audit-db';
  const info = JSON.parse(docker([...prefix, 'inspect', '--type', 'container', '--format', '{"name":{{json .Name}},"running":{{json .State.Running}},"image":{{json .Config.Image}}}', container]));
  assert.equal(info.name, `/${container}`);
  assert.equal(info.running, true);
  assert.match(info.image, /^(?:docker\.io\/(?:library\/)?|library\/)?postgres(?::|@|$)/);
  const database = `thaasbai_authority_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const args = db => [...prefix, 'exec', '-i', '--user', 'postgres', container, 'psql', '-X', '-w', '-h', '/var/run/postgresql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-At', '-f', '-'];
  const sql = (db, input) => docker(args(db), input);
  sql('postgres', `create database "${database}";`);
  console.log(`Local scratch database: ${database}`);
  try {
    sql(database, bootstrap);
    const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(f => /^\d+_[\w-]+\.sql$/.test(f)).sort();
    for (const file of migrations) sql(database, fs.readFileSync(path.join(root, 'supabase/migrations', file), 'utf8'));
    console.log(`PASS ${migrations.length} migrations in isolated local database`);
    console.log(sql(database, fs.readFileSync(path.join(__dirname, 'check-match-authority-db.sql'), 'utf8')));
    await runConcurrentCas(input => sql(database, input), args(database));
  } finally {
    sql('postgres', `drop database "${database}";`);
    console.log('Dropped only this run\'s scratch database');
  }
}

async function runConcurrentCas(sql, dockerArgs) {
  // Independent PostgreSQL sessions contend on the same revision and settlement.
  const [a, b, id] = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  try {
    sql(`insert into auth.users(id,email) values('${a}','${a}@example.invalid'),('${b}','${b}@example.invalid');
      insert into public.matches(id,game_type,pool,authority_version) values('${id}','gin_rummy','casual',1);
      insert into public.match_players(match_id,user_id,seat_index,team) values('${id}','${a}',0,'A'),('${id}','${b}',1,'B');
      insert into game_private.matches(match_id,state,deadline) values('${id}','{}',now()+interval '1 minute');`);
    const before = sql(`select sum(coins) from public.wallets where user_id in('${a}','${b}');`);
    const commit = `select public.authority_commit('${a}','${id}',0,'{"result":{"winnerUid":"${a}"}}','{}',
      '{"${a}":{"hand":[]},"${b}":{"hand":[]}}',extract(epoch from now())*1000,array['${a}']::uuid[]);`;
    const worker = () => new Promise((resolve, reject) => {
      const child = spawn('docker', dockerArgs, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      let output = '', error = '';
      const timer = setTimeout(() => { child.kill(); reject(new Error('Database race worker timed out')); }, 30000);
      child.stdout.on('data', data => { output += data; });
      child.stderr.on('data', data => { error += data; });
      child.on('error', e => { clearTimeout(timer); reject(e); });
      child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(output.split(/\r?\n/).filter(s => s === 't' || s === 'f')) : reject(new Error(error)); });
      child.stdin.end(`begin; set local statement_timeout='10s'; set local role service_role; ${commit} select pg_sleep(0.4); commit;`);
    });
    const results = await Promise.allSettled([worker(), worker()]);
    for (const result of results) if (result.status === 'rejected') throw result.reason;
    assert.deepEqual(results.flatMap(r => r.value).sort(), ['f', 't']);
    assert.equal(Number(sql(`select sum(coins) from public.wallets where user_id in('${a}','${b}');`)), Number(before) + 12);
    assert.equal(sql(`select revision from game_private.matches where match_id='${id}';`), '1');
    assert.equal(sql(`select count(*) from public.match_results where match_id='${id}';`), '1');
    assert.equal(sql(`select count(*) from public.coin_transactions where metadata->>'matchId'='${id}';`), '2');
    console.log('PASS concurrent CAS: exactly one accepted commit, one settlement and two rewards');
  } finally {
    sql(`delete from public.matches where id='${id}'; delete from auth.users where id in('${a}','${b}');`);
  }
}

module.exports = { runConcurrentCas };
if (require.main === module) (async () => {
  assert.ok(process.argv.slice(2).every(arg => arg === '--db'), 'Only --db is supported');
  let failed = 0;
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`PASS ${name}`); }
    catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
  }
  if (process.argv.includes('--db')) {
    try { await runDatabase(); }
    catch (error) { failed++; console.error(`FAIL local database checks\n${error.stack}`); }
  }
  console.log(`${tests.length} focused test groups; ${failed} failures`);
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
