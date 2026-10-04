const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { CHECKS, checkRuntime, childEnvironment, runChecks } = require('./check-integrity-core.cjs');

test('fixed inventory exists, uses portable paths and cannot enable database mode', () => {
  const root = path.resolve(__dirname, '..');
  assert.ok(CHECKS.length > 1);
  assert.equal(new Set(CHECKS.map(args => args.join(' '))).size, CHECKS.length);
  for (const [script, ...args] of CHECKS) {
    assert.equal(path.isAbsolute(script), false);
    assert.match(script, /^scripts\/check-[\w-]+\.cjs$/);
    assert.ok(fs.statSync(path.join(root, script)).isFile(), script);
    assert.ok(args.length === 0 || args.join(' ') === '--game-rules');
  }
  checkRuntime('v22.0.0');
  assert.throws(() => checkRuntime('v20.0.0'), /requires Node/);
});

test('only OS variables reach children, excluding credentials and injected Node hooks', () => {
  assert.deepEqual(childEnvironment({ Path: 'fixture-path', TMPDIR: 'fixture-temp', TZ: 'UTC',
    SUPABASE_SERVICE_ROLE_KEY: 'fixture-secret', NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid',
    DATABASE_URL: 'fixture-db', GITHUB_TOKEN: 'fixture-token', NODE_OPTIONS: '--require injection.cjs',
    NODE_PATH: 'fixture-modules', DOCKER_HOST: 'tcp://fixture.invalid:2375' }),
  { Path: 'fixture-path', TMPDIR: 'fixture-temp', TZ: 'UTC' });
});

test('real Node children run sequentially from any caller cwd and propagate exit 7', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'thaasbai-core-runner-'));
  try {
    fs.writeFileSync(path.join(temporary, 'first.cjs'), "require('node:fs').writeFileSync('order.txt', 'first');");
    fs.writeFileSync(path.join(temporary, 'second.cjs'), "const fs = require('node:fs'); require('node:assert/strict').equal(fs.readFileSync('order.txt', 'utf8'), 'first'); fs.appendFileSync('order.txt', ',second'); process.exitCode = 7;");
    fs.writeFileSync(path.join(temporary, 'third.cjs'), "require('node:fs').writeFileSync('unexpected.txt', 'ran');");
    const code = "const { runChecks } = require(process.argv[1]); process.exitCode = runChecks({ root: process.argv[2], checks: JSON.parse(process.argv[3]) });";
    const runner = path.join(__dirname, 'check-integrity-core.cjs');
    const failed = spawnSync(process.execPath, ['-e', code, runner, temporary,
      JSON.stringify([['first.cjs'], ['second.cjs'], ['third.cjs']])], {
      cwd: os.tmpdir(), encoding: 'utf8', timeout: 15_000,
    });
    assert.equal(failed.status, 7, failed.stderr);
    assert.match(failed.stderr, /FAIL second\.cjs: exit 7/);
    assert.equal(fs.readFileSync(path.join(temporary, 'order.txt'), 'utf8'), 'first,second');
    assert.equal(fs.existsSync(path.join(temporary, 'unexpected.txt')), false);
    const passed = spawnSync(process.execPath, ['-e', code, runner, temporary,
      JSON.stringify([['first.cjs']])], { cwd: os.tmpdir(), encoding: 'utf8', timeout: 15_000 });
    assert.equal(passed.status, 0, passed.stderr);
    assert.match(passed.stdout, /Core integrity passed: 1/);
  } finally {
    assert.equal(path.dirname(path.resolve(temporary)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temporary).startsWith('thaasbai-core-runner-'));
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test('launch errors, signals and timeouts fail closed and prevent subsequent suites', () => {
  for (const outcome of [
    { status: null, error: new Error('spawn ENOENT') },
    { status: null, error: new Error('spawn ETIMEDOUT'), signal: 'SIGTERM' },
    { status: null, signal: 'SIGTERM' },
    { status: null },
    { status: 9 },
  ]) {
    let calls = 0;
    const messages = [];
    const status = runChecks({ checks: [['first.cjs'], ['never.cjs']],
      log() {}, error: message => messages.push(message),
      spawn(executable, args, options) {
        calls++;
        assert.equal(executable, process.execPath);
        assert.deepEqual(args, ['first.cjs']);
        assert.equal(options.shell, false);
        assert.equal(options.timeout, 180_000);
        assert.deepEqual(options.stdio, ['ignore', 'inherit', 'inherit']);
        return outcome;
      },
    });
    assert.equal(status, outcome.status === 9 ? 9 : 1);
    assert.equal(calls, 1);
    assert.match(messages[0], /FAIL first\.cjs/);
  }
  assert.equal(runChecks({ checks: [['first.cjs']], log() {}, error() {},
    spawn() { throw new Error('launch failed'); } }), 1);
});

test('CLI rejects attempts to enable a database, change targets or choose arbitrary scripts', () => {
  for (const args of [['--db'], ['--scoped'], ['--script', 'other.cjs'], ['--game-rules', '--db']]) {
    const result = spawnSync(process.execPath, [path.join(__dirname, 'check-integrity-core.cjs'), ...args],
      { encoding: 'utf8', timeout: 10_000 });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Usage:/);
  }
});
