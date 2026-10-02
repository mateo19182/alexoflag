import { FLAG_CHARGES } from './flag-charges.js?v=cd3c4e952fdb';
export { FLAG_CHARGES };
// Original vector charges. All geometry stays local and exports with the flag.
export const EMBLEMS = [
  { id: 'lion', name: 'Lion', path: 'M28 86L38 64 28 55 19 64 10 58 22 43 38 46 48 32 43 23 48 10 62 7 74 18 68 32 57 37 66 48 78 40 87 24 94 28 86 48 69 59 64 72 80 82 76 92 58 84 51 65 45 72 44 89Z M35 49C9 40 4 24 17 15L24 19C14 29 20 37 39 39Z' },
  { id: 'eagle', name: 'Eagle', path: 'M47 27L41 18 47 9 61 13 65 20 54 24 57 35 70 24 85 8 91 11 82 31 98 21 96 34 79 47 96 42 91 54 71 61 63 60 65 75 78 90 62 86 50 96 38 86 22 90 35 75 37 60 29 61 9 54 4 42 21 47 4 34 2 21 18 31 9 11 15 8 30 24 43 35Z' },
  { id: 'serpent', name: 'Serpent', path: 'M75 9L91 17 83 29 71 25C44 20 36 31 51 39C90 58 80 87 51 91C21 97 9 77 19 61L31 65C25 75 34 83 49 78C69 72 68 61 45 53C10 40 21 11 58 12Z M86 18L98 9 95 20 99 26 87 24Z' },
  { id: 'swords', name: 'Crossed swords', path: 'M10 5L24 13 72 67 80 60 86 67 78 75 92 89 85 96 71 82 63 90 56 83 63 75 15 21Z M90 5L76 13 28 67 20 60 14 67 22 75 8 89 15 96 29 82 37 90 44 83 37 75 85 21Z' },
  { id: 'crown', name: 'Crown', path: 'M14 76L6 31 29 48 50 15 71 48 94 31 86 76Z M14 82H86V94H14Z M2 19H14V31H2Z M44 3H56V15H44Z M86 19H98V31H86Z' },
  { id: 'fleur', name: 'Fleur-de-lis', path: 'M50 3C71 24 72 39 57 58H67C68 40 81 28 92 38C107 52 88 72 72 64L66 73 77 87 60 82 50 98 40 82 23 87 34 73 28 64C12 72-7 52 8 38C19 28 32 40 33 58H43C28 39 29 24 50 3Z M26 61H74V70H26Z' },
  { id: 'laurel', name: 'Laurel', path: 'M48 94C19 83 11 57 22 19L27 22C18 55 25 76 48 87Z M52 94C81 83 89 57 78 19L73 22C82 55 75 76 52 87Z M23 32C6 29 6 14 7 9C24 13 28 20 23 32Z M20 49C2 46 1 35 2 29C20 32 26 40 20 49Z M24 66C7 68 2 56 1 50C18 49 26 56 24 66Z M35 82C18 89 9 78 7 72C24 67 33 70 35 82Z M77 32C94 29 94 14 93 9C76 13 72 20 77 32Z M80 49C98 46 99 35 98 29C80 32 74 40 80 49Z M76 66C93 68 98 56 99 50C82 49 74 56 76 66Z M65 82C82 89 91 78 93 72C76 67 67 70 65 82Z' },
  { id: 'stag', name: 'Stag', path: 'M28 53L58 49 65 34 61 22 50 18 43 5 49 3 55 13 61 14 59 3 66 3 68 17 76 16 82 3 88 6 82 22 72 26 76 37 85 42 82 50 72 48 65 65 59 91 50 91 53 67 40 67 35 92 26 92 29 65 20 59 10 42 17 39Z' },
  { id: 'tower', name: 'Tower', path: 'M21 8H33V21H44V8H56V21H67V8H79V38L73 44V83H84V96H16V83H27V44L21 38Z M42 48V63H58V48Z M41 81V96H59V81C59 67 41 67 41 81Z', rule: 'evenodd' },
  { id: 'anchor', name: 'Anchor', path: 'M43 24A13 13 0 1 1 57 24V35H77V44H57V75C68 74 77 65 80 56L70 58 84 41 97 58 88 57C82 81 66 88 50 97C34 88 18 81 12 57L3 58 16 41 30 58 20 56C23 65 32 74 43 75V44H23V35H43Z M45 13A5 5 0 1 0 55 13A5 5 0 1 0 45 13Z', rule: 'evenodd' },
  { id: 'rose', name: 'Rose', path: 'M50 7C69-4 81 14 75 28C98 23 108 47 89 60C103 80 79 99 64 86C55 107 30 100 30 82C8 93-8 69 10 54C-7 36 13 16 31 25C27 9 40 1 50 7Z M50 32A18 18 0 1 0 50 68A18 18 0 1 0 50 32Z M50 41A9 9 0 1 1 50 59A9 9 0 1 1 50 41Z', rule: 'evenodd' },
  { id: 'bolt', name: 'Thunderbolt', path: 'M48 2H78L57 37H88L25 98 40 57H12Z' }
];
// Only standalone charges belong in the picker or new random flags.
// The full historical catalog remains available to resolve existing documents.
const standaloneIds = new Set([
  'albania', 'sri-lanka', 'bhutan', 'wales', 'canada', 'saudi-arabia', 'hong-kong',
  'argentina', 'uruguay', 'korea', 'pakistan', 'turkey', 'algeria', 'malaysia',
  'azerbaijan', 'uganda', 'zimbabwe', 'zambia', 'eswatini', 'lesotho', 'ethiopia',
  'taiwan', 'philippines', 'papua', 'dominica', 'barbados', 'guernsey', 'isle-of-man'
]);
const vectorCategories = {
  lion: 'Animals', eagle: 'Animals', serpent: 'Animals', stag: 'Animals',
  swords: 'Weapons', crown: 'Symbols', fleur: 'Plants', laurel: 'Plants',
  tower: 'Symbols', anchor: 'Symbols', rose: 'Plants', bolt: 'Celestial'
};
export const SYMBOL_LIBRARY = [
  ...EMBLEMS.map(item => ({ ...item, ratio: 1, category: vectorCategories[item.id] })),
  ...FLAG_CHARGES.filter(item => standaloneIds.has(item.id))
];
export const emblemById = id => [...FLAG_CHARGES, ...EMBLEMS].find(emblem => emblem.id === id) || EMBLEMS[0];
export function emblemSvg(id) {
  const emblem = emblemById(id);
  if (emblem.asset) return `<img src="${new URL('../assets/charges/' + emblem.code + '.png', import.meta.url).href}" alt="${emblem.name}"/>`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${emblem.path}" fill="currentColor" fill-rule="${emblem.rule || 'nonzero'}"/></svg>`;
}
export function validImageSource(value) {
  return typeof value === 'string' && value.length <= 350000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

const chargeLoads = new Map();
export function loadCharge(id) {
  const charge = FLAG_CHARGES.find(item => item.id === id);
  if (!charge || charge.source) return Promise.resolve(charge);
  if (!chargeLoads.has(id)) {
    chargeLoads.set(id, import(`./charge-data/${id}.js?v=cd3c4e952fdb`).then(module => {
      charge.source = module.default;
      return charge;
    }).catch(error => { chargeLoads.delete(id); throw error; }));
  }
  return chargeLoads.get(id);
}
export function prepareCharges(layers) {
  return Promise.all([...new Set(layers.filter(layer => layer.type === 'image' && !layer.imageSource).map(layer => layer.emblem))].map(loadCharge));
}
