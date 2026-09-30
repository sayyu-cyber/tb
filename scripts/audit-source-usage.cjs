/** Read-only dependency inventory. Candidates require review, never automatic deletion. */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const directories = ['app', 'components', 'contexts', 'hooks', 'lib', 'data', 'constants', 'types', 'functions/src'];
const files = [];
function walk(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) walk(file);
    else if (/\.[cm]?[jt]sx?$/.test(item.name) && !item.name.endsWith('.d.ts')) files.push(file);
  }
}
for (const directory of directories) walk(path.join(root, directory));

const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const cache = ts.createModuleResolutionCache(root, file => file, options);
const graph = new Map();
const unresolved = [];
const dynamic = [];
const relative = file => path.relative(root, file).split(path.sep).join('/');

for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const dependencies = new Set();
  function resolve(specifier) {
    const resolved = ts.resolveModuleName(specifier, file, options, ts.sys, cache).resolvedModule;
    if (resolved && !resolved.isExternalLibraryImport) dependencies.add(path.normalize(resolved.resolvedFileName));
    else if (!resolved && (specifier.startsWith('.') || specifier.startsWith('@/')) && !specifier.endsWith('.css')) {
      unresolved.push({ file: relative(file), specifier });
    }
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      resolve(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteralLike(argument)) resolve(argument.text);
      else dynamic.push({ file: relative(file), expression: node.getText(source) });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  graph.set(file, dependencies);
}

// All app files are conservative roots, including Next's implicit route conventions.
const entries = files.filter(file => relative(file).startsWith('app/') || relative(file) === 'functions/src/index.ts');
const reachable = new Set();
function mark(file) {
  if (reachable.has(file)) return;
  reachable.add(file);
  for (const dependency of graph.get(file) || []) mark(dependency);
}
entries.forEach(mark);
const candidates = files.filter(file => !reachable.has(file)).map(relative).sort();
console.log(JSON.stringify({
  note: 'Static source reachability only. Type imports count as usage; styles, assets, tests, computed imports and runtime strings need manual review before deletion.',
  scannedFiles: files.length,
  entryFiles: entries.length,
  candidateCount: candidates.length,
  candidates,
  unresolved,
  dynamic,
}, null, 2));
