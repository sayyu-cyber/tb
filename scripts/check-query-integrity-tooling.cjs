/** Local temp-file/loopback checks; no backend access or repository output files. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'thaasbai-query-integrity-'));

function write(relative, content) {
  const file = path.join(temporary, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content);
}
function auditChecks() {
  write('tsconfig.json', JSON.stringify({ compilerOptions: { moduleResolution: 'bundler', module: 'esnext', allowJs: true, paths: { '@/*': ['./*'] } } }));
  write('app/page.ts', [
    "import '../lib/static';",
    "export * from '../lib/reexport';",
    "import('../lib/lazy');",
    'import(`../lib/template`);',
    "import(flag ? '../lib/left' : '../lib/right');",
    "type T = import('../lib/type-only').T;",
    "new Worker(new URL('../lib/worker.ts', import.meta.url));",
    "new URL('../public/photo.png', import.meta.url);",
    "import('../lib/' + computed);",
    "import '../styles/site.css';",
  ].join('\n'));
  write('scripts/run.cjs', "require('../lib/script-only'); require.resolve('../lib/resolved');");
  write('src/instrumentation.ts', "import '../lib/instrumented';");
  write('next.config.js', "require('./lib/config-only');");
  for (const name of ['static', 'reexport', 'lazy', 'template', 'left', 'right', 'type-only', 'worker', 'script-only', 'resolved', 'instrumented', 'config-only', 'review-candidate']) write(`lib/${name}.ts`, 'export type T = string;');
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/audit-source-usage.cjs'), '--root', temporary], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.missingRoots.includes('functions/src'));
  assert.deepEqual(report.candidates, ['lib/review-candidate.ts']);
  assert.equal(report.dynamic.length, 1); assert.match(report.dynamic[0].expression, /computed/);
  assert.deepEqual(report.unresolved, []);
  assert.ok(fs.existsSync(path.join(temporary, 'lib/review-candidate.ts')));
  const current = spawnSync(process.execPath, [path.join(root, 'scripts/audit-source-usage.cjs')], { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
  assert.equal(current.status, 0, current.stderr);
  const currentReport = JSON.parse(current.stdout);
  assert.ok(currentReport.scannedFiles > 0);
  console.log(`PASS source inventory: optional roots, dynamic/type/worker/script/config dependencies, manual candidates; repository scan ${currentReport.scannedFiles} files`);
}

function databaseRunnerChecks() {
  const { isLocalDocker, options } = require('./check-integrity-db.cjs');
  for (const endpoint of ['unix:///var/run/docker.sock', 'npipe:////./pipe/dockerDesktopLinuxEngine']) assert.ok(isLocalDocker(endpoint));
  for (const endpoint of ['tcp://127.0.0.1:2375', 'ssh://remote', 'https://production.example', 'npipe:////remote/pipe/docker', '']) assert.equal(isLocalDocker(endpoint), false);
  assert.throws(() => options([], { DOCKER_HOST: 'tcp://production.example:2375' }), /nonlocal/);
  assert.throws(() => options(['--container', 'production'], {}), /cannot be overridden/);
  assert.throws(() => options(['--database', 'postgres'], {}), /cannot be overridden/);
  assert.deepEqual(options(['--check'], {}), { check: true, keep: false, help: false });
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/check-integrity-db.cjs'), '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /no Docker commands executed/);
  console.log('PASS database runner guards: local socket/pipe only, fixed container, generated database only; migration inventory without Docker');
}

async function freePort() {
  const server = net.createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}

async function previewChecks() {
  write('out/index.html', '<h1>Fixture home</h1>');
  write('out/nested/route/index.html', '<h1>Nested route</h1>');
  const script = path.join(root, 'scripts/preview.mjs');
  const env = { ...process.env, THAASBAI_BUILD_DIR: path.join(temporary, 'out') };
  for (const args of [['-p'], ['--port=0'], ['-p', '-1'], ['--port', '65536'], ['--port', '3.5'], ['--unknown']]) {
    const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /port|argument/i);
  }
  for (const form of ['short', 'long', 'equals', 'environment']) {
    const port = await freePort();
    const args = form === 'short' ? ['-p', String(port)] : form === 'long' ? ['--port', String(port)] : form === 'equals' ? [`--port=${port}`] : [];
    const child = spawn(process.execPath, [script, ...args], { env: { ...env, PORT: form === 'environment' ? String(port) : 'invalid-overridden-value' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const closed = once(child, 'close');
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Preview startup timeout: ${output}`)), 8000);
        child.stdout.on('data', data => { output += data; if (output.includes(`127.0.0.1:${port}`)) { clearTimeout(timer); resolve(); } });
        child.stderr.on('data', data => { output += data; });
        child.once('error', error => { clearTimeout(timer); reject(error); });
        child.once('exit', code => { clearTimeout(timer); reject(new Error(`Preview exited ${code}: ${output}`)); });
      });
      const base = `http://127.0.0.1:${port}`;
      const home = await fetch(base); assert.equal(home.status, 200); assert.match(await home.text(), /Fixture home/);
      const nested = await fetch(`${base}/nested/route/`); assert.equal(nested.status, 200); assert.match(await nested.text(), /Nested route/);
      const head = await fetch(`${base}/nested/route/`, { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(await head.text(), '');
      assert.equal((await fetch(`${base}/missing`)).status, 404);
      assert.equal((await fetch(base, { method: 'POST' })).status, 405);
    } finally { child.kill(); await closed; }
  }
  console.log('PASS preview: -p/--port/--port=, PORT fallback/CLI override, invalid ports, nested routes, HEAD/404/405');
}

(async () => {
  try { auditChecks(); databaseRunnerChecks(); await previewChecks(); }
  finally {
    const resolved = path.resolve(temporary), parent = path.resolve(os.tmpdir());
    assert.equal(path.dirname(resolved), parent); assert.ok(path.basename(resolved).startsWith('thaasbai-query-integrity-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
