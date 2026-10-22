const { test } = require('node:test');
const assert = require('node:assert/strict');
const data = require('../data/items.json');
const series = ['機甲兵', 'ラッシュ', '覚者', 'ミッション', 'ミラージュ'];
const newest = data.filter(x => series.some(prefix => x.name.startsWith(prefix)));
const cells = name => {
  const item = newest.find(x => x.name === name);
  return item.layout.map(row => row.map(key => {
    if (key === null) return null;
    const v = item.targetValues[key];
    return v.min === v.max ? v.min : `${v.min}-${v.max}`;
  }));
};
test('25 recipes, five parts per series, complete materials and consistent custom layouts', () => {
  assert.equal(newest.length, 25);
  for (const prefix of series) {
    const items = newest.filter(x => x.name.startsWith(prefix));
    assert.equal(items.length, 5);
    assert.deepEqual(new Set(items.map(x => x.subCategory)), new Set(['アタマ','からだ上','からだ下','ウデ','足']));
    for (const item of items) {
      assert.equal(item.category, ['機甲兵','ラッシュ'].includes(prefix) ? '防具鍛冶' : '裁縫');
      assert.equal(item.gridType, 'custom');
      assert.equal(item.materials.length, 5);
      assert.ok(item.materials.every(m => m.name && Number.isInteger(m.quantity) && m.quantity > 0));
      assert.ok(item.specialTrait);
      const keys = item.layout.flat().filter(Boolean);
      assert.equal(new Set(keys).size, keys.length);
      assert.deepEqual(new Set(keys), new Set(Object.keys(item.targetValues)));
      assert.ok(Object.values(item.targetValues).every(v => Number.isInteger(v.min) && v.min > 0 && v.max >= v.min));
    }
  }
});
test('new entries precede old entries in every category and part', () => {
  for (const category of ['防具鍛冶','裁縫']) for (const subCategory of ['アタマ','からだ上','からだ下','ウデ','足']) {
    const group = data.filter(x => x.category === category && x.subCategory === subCategory);
    const count = category === '防具鍛冶' ? 2 : 3;
    assert.ok(group.slice(0,count).every(x => newest.includes(x)));
    assert.ok(group.slice(count).every(x => !newest.includes(x)));
  }
});
test('image-specific empty slots, weaving arrangements and values are preserved', () => {
  assert.deepEqual(cells('機甲兵のグリーブ'), [[null,'290-300'],[null,'170-178'],['290-300','205-213']]);
  assert.deepEqual(cells('ラッシュシューズ'), [[null,'380-389'],[null,'200-209'],['260-269','500-509']]);
  assert.deepEqual(cells('覚者の髪飾り'), [[null,430,null],[530,120,410]]);
  assert.deepEqual(cells('ミッションベレー'), [[null,435,null],[280,160,350]]);
  assert.deepEqual(cells('ミラージュハット'), [[null,320,null],[420,140,295]]);
  assert.deepEqual(cells('覚者の装束上'), [[150,110,170],[100,80,110],[120,170,90]]);
  assert.deepEqual(cells('ミッションシャツ'), [[100,200,90],[90,160,140],[120,110,80]]);
  assert.deepEqual(cells('ミラージュスーツ上'), [[200,110,130],[125,100,90],[80,150,110]]);
});
test('four user-confirmed material overrides follow the images, not the website', () => {
  const material = (item, name) => newest.find(x => x.name === item).materials.find(m => m.name === name)?.quantity;
  assert.equal(material('機甲兵のレシーバー','まじゅうのツメ'),14);
  assert.equal(material('機甲兵のよろい下','超ようせいのひだね'),6);
  assert.equal(material('機甲兵のグリーブ','超ようせいのひだね'),5);
  assert.equal(material('ラッシュジャケット','レッドオーブ'),10);
});
