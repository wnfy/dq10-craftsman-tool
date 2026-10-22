(function (root) {
  'use strict';
  const STORAGE_KEY = 'dqx_price_book_v1';
  const cleanPrices = (prices) => Object.fromEntries(
    Object.entries(prices && typeof prices === 'object' && !Array.isArray(prices) ? prices : {})
      .filter(([name, price]) => name && Number.isSafeInteger(price) && price >= 0)
  );
  const empty = () => ({ version: 1, materials: {}, tools: {} });
  const read = (storage) => {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const book = JSON.parse(raw);
    if (!book || book.version !== 1) throw new Error('Unsupported price book');
    return { version: 1, materials: cleanPrices(book.materials), tools: cleanPrices(book.tools) };
  };
  const saveRecipe = (book, item, materials, tools) => {
    const next = { version: 1, materials: { ...book.materials }, tools: { ...book.tools } };
    item.materials.forEach(({ name }) => {
      if (Object.hasOwn(materials, name)) next.materials[name] = materials[name];
      else delete next.materials[name];
    });
    if (Object.hasOwn(tools, item.name)) next.tools[item.name] = tools[item.name];
    else delete next.tools[item.name];
    return next;
  };
  const reset = (book, { materials = [], tool, allMaterials = false } = {}) => {
    const next = { version: 1, materials: allMaterials ? {} : { ...book.materials }, tools: { ...book.tools } };
    materials.forEach(name => { delete next.materials[name]; });
    if (tool) delete next.tools[tool];
    return next;
  };
  const write = (storage, book) => storage.setItem(STORAGE_KEY, JSON.stringify(book));
  const api = { STORAGE_KEY, empty, read, saveRecipe, reset, write };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DqxPriceBook = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
