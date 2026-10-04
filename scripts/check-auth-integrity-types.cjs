const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const files = [
  'contexts/AuthContext.tsx', 'lib/supabase/auth.ts', 'lib/safeStorage.ts',
  'components/layout/phone/Sheet.tsx', 'components/auth/AccountCompletionNotice.tsx',
  'components/auth/AccountRecovery.tsx', 'app/(auth)/login/page.tsx',
  'app/(auth)/forgot-password/page.tsx', 'app/(auth)/reset-password/page.tsx',
  'app/(auth)/confirm-email/page.tsx', 'scripts/check-auth-integrity-entry.tsx',
  'scripts/check-auth-integrity-services.tsx',
].map(file => path.join(root, file));
const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram(files, { ...parsed.options, incremental: false, noEmit: true });
const diagnostics = [...program.getOptionsDiagnostics(), ...program.getGlobalDiagnostics()];
for (const file of files) {
  const source = program.getSourceFile(file);
  diagnostics.push(...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source));
}
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => root, getCanonicalFileName: file => file, getNewLine: () => '\n',
  }));
  process.exitCode = 1;
} else console.log(`PASS focused auth typecheck: ${files.length} owned TypeScript files (no emitted files)`);
