// Server pricing/rewards use the existing catalogue without duplicating amounts.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) { return resolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
Module._extensions['.ts'] = function(mod, file) { mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file); };
const data = require('../data/cosmetics.ts');
const byId = entries => Object.fromEntries(entries.map(item => [item.id, item]));
module.exports = {
  daily: data.DAILY_LOGIN_REWARDS,
  cosmetics: byId(data.ALL_COSMETICS.map(({ id, price, category }) => ({ id, price, category }))),
  missions: byId([...data.DAILY_MISSION_TEMPLATES, ...data.WEEKLY_MISSION_TEMPLATES].map(({ id, reward, rewardCosmeticId }) => ({ id, reward, rewardCosmeticId }))),
  achievements: byId(data.ACHIEVEMENTS.map(({ id, reward }) => ({ id, reward }))),
  roomCards: data.ROOM_CARD_PRICES,
  ranks: Object.fromEntries(data.RANK_CONFIGS.map(rank => [rank.tier, rank.weeklyReward])),
};
if (require.main === module) {
  const file = path.join(root, 'supabase/migrations/202609300006_authoritative_wallet_rewards.sql');
  const marker = '-- CATALOG_SEED';
  const sql = fs.readFileSync(file, 'utf8');
  if (!sql.includes(marker)) throw new Error('Catalogue seed marker missing');
  const seed = "insert into public.app_config (id, value) values ('economyCatalog', $catalog$" + JSON.stringify(module.exports) + "$catalog$::jsonb) on conflict (id) do nothing;";
  fs.writeFileSync(file, sql.replace(marker, seed));
  console.log('Seeded SQL from existing cosmetic prices and reward amounts.');
}
