const path = require('node:path');
const compiler = require('next/dist/compiled/webpack/webpack');
compiler.init();
const root = path.resolve(__dirname, '..');
compiler.webpack({ mode: 'production', target: 'webworker', devtool: false,
  entry: path.join(root, 'server/matchCommandEntry.ts'),
  output: { path: path.join(root, 'supabase/functions/match-command'), filename: 'index.js' },
  resolve: { extensions: ['.ts', '.js'] },
  module: { rules: [{ test: /\.ts$/, exclude: /node_modules/, use: path.join(root, 'scripts/friends-test-loader.cjs') }] },
  optimization: { minimize: false },
}, (error, stats) => {
  if (error || stats.hasErrors()) { console.error(error || stats.toString()); process.exitCode = 1; }
  else console.log('Built trusted match-command Edge Function. Not deployed.');
});
