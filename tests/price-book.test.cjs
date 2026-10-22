const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../assets/price-book.js');
const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const item = { name: 'レシピA', materials: [{ name: '流星石' }, { name: '超ひだね' }] };
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
test('explicit save persists only the selected recipe, including zero and tool cost', () => {
  const s = storage();
  const draft = { 流星石: 100, 超ひだね: 0, 別素材: 999 };
  assert.deepEqual(P.read(s), P.empty());
  const next = P.saveRecipe(P.empty(), item, draft, { レシピA: 30000, レシピB: 500 });
  P.write(s, next);
  assert.deepEqual(P.read(s), { version: 1, materials: { 流星石: 100, 超ひだね: 0 }, tools: { レシピA: 30000 } });
  assert.equal(draft.別素材, 999);
});
test('save preserves unrelated saved prices and updates shared material by name', () => {
  const book = { version: 1, materials: { 流星石: 1, 別素材: 5 }, tools: { レシピB: 7 } };
  const next = P.saveRecipe(book, item, { 流星石: 100 }, {});
  assert.deepEqual(next.materials, { 流星石: 100, 別素材: 5 });
  assert.deepEqual(next.tools, { レシピB: 7 });
  assert.equal(book.materials.流星石, 1);
});
test('single material, recipe materials, all materials, and tool resets are independent', () => {
  const book = { version: 1, materials: { 流星石: 100, 超ひだね: 200, 別素材: 3 }, tools: { レシピA: 30000, レシピB: 500 } };
  assert.deepEqual(P.reset(book, { materials: ['流星石'] }).materials, { 超ひだね: 200, 別素材: 3 });
  assert.deepEqual(P.reset(book, { materials: item.materials.map(x => x.name) }).materials, { 別素材: 3 });
  const all = P.reset(book, { allMaterials: true });
  assert.deepEqual(all.materials, {});
  assert.deepEqual(all.tools, book.tools);
  assert.deepEqual(P.reset(book, { tool: 'レシピA' }).tools, { レシピB: 500 });
  assert.equal(book.materials.流星石, 100);
});
test('reset survives reload and never modifies revenue storage', () => {
  const s = storage();
  s.setItem('dqx_profit_records', '[{"profit":123}]');
  P.write(s, P.saveRecipe(P.empty(), item, { 流星石: 100 }, {}));
  P.write(s, P.reset(P.read(s), { materials: ['流星石'] }));
  assert.deepEqual(P.read(s).materials, {});
  assert.equal(s.getItem('dqx_profit_records'), '[{"profit":123}]');
});
test('bad stored values are filtered; corrupt / unsupported storage and write errors surface', () => {
  const s = storage();
  s.setItem(P.STORAGE_KEY, '{"version":1,"materials":{"ok":0,"negative":-1,"string":"9","huge":1e100},"tools":null}');
  assert.deepEqual(P.read(s).materials, { ok: 0 });
  assert.deepEqual(P.read(s).tools, {});
  s.setItem(P.STORAGE_KEY, '{broken');
  assert.throws(() => P.read(s));
  s.setItem(P.STORAGE_KEY, '{"version":2}');
  assert.throws(() => P.read(s));
  assert.throws(() => P.write({ setItem() { throw new Error('quota'); } }, P.empty()));
});
test('search, category changes and search reset never discard price drafts', () => {
  assert.doesNotMatch(html, /setMaterialPrices\(\{\}\)/);
  assert.doesNotMatch(html, /setToolPrices\(\{\}\)/);
  assert.doesNotMatch(html, /materialPrices\[`\$\{item\.name\}-/);
});
