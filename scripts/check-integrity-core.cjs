// Portable offline gate. Every suite runs in its own Node process, in order.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CHECKS = Object.freeze([
  ['scripts/check-integrity-core-runner.cjs'],
  ['scripts/check-integrity-core.cjs', '--game-rules'],
  ['scripts/check-auth-integrity-types.cjs'],
  ['scripts/check-social-integrity.cjs'],
  ['scripts/check-friends-loading.cjs'],
  ['scripts/check-economy-integrity.cjs'],
  ['scripts/check-match-authority.cjs'],
  ['scripts/check-private-room-integrity.cjs'],
  ['scripts/check-query-integrity.cjs'],
  ['scripts/check-query-integrity-tooling.cjs'],
  ['scripts/check-post-match-integration.cjs'],
].map(args => Object.freeze(args)));

function checkRuntime(version = process.version) {
  const semver = require('next/dist/compiled/semver');
  const directory = path.join(ROOT, 'node_modules', '@supabase');
  for (const name of fs.readdirSync(directory)) {
    const file = path.join(directory, name, 'package.json');
    if (!fs.existsSync(file)) continue;
    const metadata = JSON.parse(fs.readFileSync(file, 'utf8'));
    const range = metadata.engines?.node;
    if (range && !semver.satisfies(version, range)) {
      throw new Error(`${metadata.name}@${metadata.version} requires Node ${range}; running ${version}. Use Node 22 or a newer supported runtime.`);
    }
  }
}

function childEnvironment(source) {
  // Retain OS/runtime necessities, excluding credentials, backend URLs and Node hooks.
  const allowed = new Set([
    'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC',
    'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA',
    'LANG', 'LC_ALL', 'LC_CTYPE', 'TZ',
  ]);
  return Object.fromEntries(Object.entries(source).filter(([key]) => allowed.has(key.toUpperCase())));
}

function runChecks({ checks = CHECKS, root = ROOT, spawn = spawnSync, env = process.env,
  log = console.log, error = console.error } = {}) {
  for (const args of checks) {
    const label = args.join(' ');
    log(`\nRUN ${label}`);
    let result;
    try {
      result = spawn(process.execPath, args, {
        cwd: root, env: childEnvironment(env), shell: false, windowsHide: true,
        stdio: ['ignore', 'inherit', 'inherit'], timeout: 180_000,
      });
    } catch (cause) {
      error(`FAIL ${label}: ${cause.message}`);
      return 1;
    }
    if (result.error || result.signal || result.status !== 0) {
      const reason = result.error?.message || (result.signal ? `signal ${result.signal}` : `exit ${result.status}`);
      error(`FAIL ${label}: ${reason}`);
      return !result.error && !result.signal && Number.isInteger(result.status) && result.status > 0 ? result.status : 1;
    }
    log(`PASS ${label}`);
  }
  log(`\nCore integrity passed: ${checks.length} sequential offline suites.`);
  return 0;
}

function runGameRules() {
  const ts = require('typescript');
  const previous = require.extensions['.ts'];
  // The existing rules entry exits with its assertion result. Transpile only in this child.
  require.extensions['.ts'] = (module, filename) => {
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename, reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    if (compiled.diagnostics?.length) {
      throw new Error(ts.formatDiagnosticsWithColorAndContext(compiled.diagnostics, {
        getCurrentDirectory: () => ROOT, getCanonicalFileName: file => file, getNewLine: () => '\n',
      }));
    }
    module._compile(compiled.outputText, filename);
  };
  try { require('./check-game-rules.ts'); }
  finally {
    if (previous) require.extensions['.ts'] = previous;
    else delete require.extensions['.ts'];
  }
}

module.exports = { CHECKS, checkRuntime, childEnvironment, runChecks };
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--game-rules') runGameRules();
    else if (args.length === 0) {
      checkRuntime();
      process.exitCode = runChecks();
    } else throw new Error('Usage: node scripts/check-integrity-core.cjs (no arguments); --game-rules is the isolated rules child.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
