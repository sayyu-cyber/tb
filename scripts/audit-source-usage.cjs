/** Read-only dependency inventory. Candidates require review, never automatic deletion. */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--root')) throw new Error('Usage: node scripts/audit-source-usage.cjs [--root DIRECTORY]');
const root = args.length ? path.resolve(args[1]) : path.resolve(__dirname, '..');
const directories = ['app', 'pages', 'src', 'components', 'contexts', 'hooks', 'lib', 'data', 'constants', 'types', 'scripts', 'functions/src'];
const files = [];
const missingRoots = [];
function walk(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') walk(file);
    else if (/\.[cm]?[jt]sx?$/.test(item.name) && !item.name.endsWith('.d.ts')) files.push(file);
  }
}
for (const directory of directories) {
  const absolute = path.join(root, directory);
  if (fs.existsSync(absolute)) walk(absolute);
  else missingRoots.push(directory);
}
for (const item of fs.readdirSync(root, { withFileTypes: true })) {
  if (item.isFile() && /\.[cm]?[jt]sx?$/.test(item.name) && !item.name.endsWith('.d.ts')) files.push(path.join(root, item.name));
}

const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const cache = ts.createModuleResolutionCache(root, file => file, options);
const graph = new Map();
const unresolved = [];
const dynamic = [];
const relative = file => path.relative(root, file).split(path.sep).join('/');
const isAsset = specifier => /\.(css|scss|sass|less|svg|png|jpe?g|webp|gif|ico|woff2?|mp3|ogg)(\?.*)?$/.test(specifier);

for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const dependencies = new Set();
  function resolve(specifier) {
    const resolved = ts.resolveModuleName(specifier, file, options, ts.sys, cache).resolvedModule;
    if (resolved && !resolved.isExternalLibraryImport) dependencies.add(path.normalize(resolved.resolvedFileName));
    else if (!resolved && (specifier.startsWith('.') || specifier.startsWith('@/')) && !isAsset(specifier)) {
      unresolved.push({ file: relative(file), specifier });
    }
  }
  function resolveArgument(argument, node) {
    if (argument && ts.isStringLiteralLike(argument)) resolve(argument.text);
    else if (argument && ts.isConditionalExpression(argument)) {
      resolveArgument(argument.whenTrue, node);
      resolveArgument(argument.whenFalse, node);
    } else dynamic.push({ file: relative(file), expression: node.getText(source) });
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      resolve(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require') ||
      (ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText(source) === 'require' && node.expression.name.text === 'resolve'))) {
      resolveArgument(node.arguments[0], node);
    }
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteralLike(node.argument.literal)) {
      resolve(node.argument.literal.text);
    }
    // Bundlers discover workers and assets through new URL('./worker.ts', import.meta.url).
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'URL' && node.arguments?.[1]?.getText(source) === 'import.meta.url') {
      resolveArgument(node.arguments[0], node);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  graph.set(file, dependencies);
}

// All app files are conservative roots, including Next's implicit route conventions.
const entries = files.filter(file => /^(app|pages|src\/app|src\/pages|scripts)\//.test(relative(file)) ||
  !relative(file).includes('/') || /^src\/(middleware|instrumentation)\./.test(relative(file)) || relative(file) === 'functions/src/index.ts');
const reachable = new Set();
function mark(file) {
  if (reachable.has(file)) return;
  reachable.add(file);
  for (const dependency of graph.get(file) || []) mark(dependency);
}
entries.forEach(mark);
const candidates = files.filter(file => !reachable.has(file)).map(relative).sort();
console.log(JSON.stringify({
  note: 'Read-only inventory, not a deletion list. Type imports, literal/conditional dynamic imports, worker URLs and script entry points count as usage. Styles, assets, computed imports and runtime strings still need manual review.',
  missingRoots,
  scannedFiles: files.length,
  entryFiles: entries.length,
  candidateCount: candidates.length,
  candidates,
  unresolved,
  dynamic,
}, null, 2));
