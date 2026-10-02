import { EMBLEMS, FLAG_CHARGES, SYMBOL_LIBRARY, validImageSource } from './emblems.js?v=cd3c4e952fdb';
import { defaultLfos, normalizeMotion } from './modulation.js?v=cd3c4e952fdb';
import { composeRandomFlag } from './random.js?v=cd3c4e952fdb';

export const TYPES = [
  { id: 'band', label: 'Band', icon: '▰', group: 'campo' },
  { id: 'stripes', label: 'Stripes', icon: '▥', group: 'campo' },
  { id: 'cross', label: 'Cross', icon: '✚', group: 'campo' },
  { id: 'saltire', label: 'Saltire', icon: '╳', group: 'campo' },
  { id: 'chevron', label: 'Chevron', icon: '⌄', group: 'campo' },
  { id: 'triangle', label: 'Triangle', icon: '△', group: 'forma' },
  { id: 'diamond', label: 'Diamond', icon: '◇', group: 'forma' },
  { id: 'circle', label: 'Circle', icon: '○', group: 'forma' },
  { id: 'star', label: 'Star', icon: '✳', group: 'símbolo' },
  { id: 'sun', label: 'Sun', icon: '☼', group: 'símbolo' },
  { id: 'crescent', label: 'Crescent', icon: '☾', group: 'símbolo' },
  { id: 'rays', label: 'Rays', icon: '✺', group: 'patrón' },
  { id: 'dots', label: 'Dots', icon: '⠿', group: 'patrón' },
  { id: 'checks', label: 'Checks', icon: '▦', group: 'patrón' },
  { id: 'waves', label: 'Waves', icon: '≋', group: 'patrón' },
  { id: 'image', label: 'Image', icon: '▧', group: 'símbolo' },
  { id: 'text', label: 'Text', icon: 'A', group: 'símbolo' }
];

export const PALETTE = ['#e9e6da', '#253b43', '#e46749', '#e2b458', '#8c9d8b', '#593f53', '#f8f5ea', '#151f28', '#647eae', '#cf735e'];
export const RATIOS = ['3:2', '5:3', '2:1', '4:3', '1:1'];
export const DITHER_SHAPES = ['circle', 'square', 'diamond', 'line'];
export const COLOR_MODES = ['color', 'gray', 'bw'];
const typeIds = new Set(TYPES.map(type => type.id));
const hex = /^#[0-9a-f]{6}$/i;
const limit = (n, min, max, fallback) => Number.isFinite(Number(n)) ? Math.min(max, Math.max(min, Number(n))) : fallback;
const color = (value, fallback) => typeof value === 'string' && hex.test(value) ? value.toLowerCase() : fallback;

export function makeLayer(type, overrides = {}) {
  const defaults = {
    id: crypto.randomUUID(), type, x: .5, y: .5, w: .62, h: .62, rotation: 0,
    opacity: 1, color: '#303030', color2: '#858585', count: 6, detail: .28,
    dither: 0, ditherSize: .5, ditherShape: 'circle', colorMode: 'color', blur: 0, warp: 0, echo: 0,
    text: 'FLAG', visible: true, locked: false, emblem: 'albania', imageSource: '', imageName: '', imageTint: false, mirror: false, repeat: 1
  };
  const byType = {
    band: { w: 1.1, h: .26 }, stripes: { w: 1.1, h: 1.1, count: 5 },
    cross: { w: 1.12, h: 1.12 }, saltire: { w: 1.15, h: 1.25 },
    chevron: { w: 1.1, h: 1.1 }, triangle: { w: .7, h: .8 },
    diamond: { w: .5, h: .7 }, circle: { w: .42, h: .65 },
    star: { w: .38, h: .56, count: 5 }, sun: { w: .46, h: .68, count: 12 },
    crescent: { w: .42, h: .64 }, rays: { w: .9, h: 1.2, count: 12 },
    dots: { w: .72, h: .8, count: 5 }, checks: { w: .8, h: 1, count: 6 },
    image: { w: .36, h: .54 }, waves: { w: 1.1, h: .8, count: 5 }, text: { w: .7, h: .28 }
  };
  return { ...defaults, ...(byType[type] || {}), ...overrides };
}

export function initialDocument() {
  return {
    version: 2, ratio: '3:2', background: '#e7e7e1', lfos: defaultLfos(), routes: [],
    layers: [
      makeLayer('band', { x: .16, y: .5, w: .32, h: 1.25, color: '#303030' }),
      makeLayer('star', { x: .16, y: .5, w: .17, h: .25, color: '#e7e7e1', count: 8, detail: .42 }),
      makeLayer('circle', { x: .65, y: .5, w: .3, h: .46, color: '#858585', dither: .38, ditherSize: .26 })
    ]
  };
}

export function normalizeDocument(input) {
  if (!input || typeof input !== 'object' || ![1, 2].includes(input.version) || !Array.isArray(input.layers)) return null;
  const ids = new Set();
  const layers = input.layers.slice(0, 80).filter(layer => layer && typeIds.has(layer.type)).map(layer => {
    let id = typeof layer.id === 'string' && /^[\w-]{1,80}$/.test(layer.id) ? layer.id : crypto.randomUUID();
    if (ids.has(id)) id = crypto.randomUUID();
    ids.add(id);
    return makeLayer(layer.type, {
      id, x: limit(layer.x, -2, 3, .5), y: limit(layer.y, -2, 3, .5),
      w: limit(layer.w, .01, 3, .5), h: limit(layer.h, .01, 3, .5),
      rotation: limit(layer.rotation, -3600, 3600, 0), opacity: limit(layer.opacity, 0, 1, 1),
      color: color(layer.color, '#253b43'), color2: color(layer.color2, '#e46749'),
      count: Math.round(limit(layer.count, 2, 32, 6)), detail: limit(layer.detail, .02, .95, .28),
      dither: limit(layer.dither, 0, 1, 0), blur: limit(layer.blur, 0, 1, 0),
      warp: limit(layer.warp, 0, 1, 0), echo: limit(layer.echo, 0, 1, 0),
      ditherSize: limit(layer.ditherSize, 0, 1, .5),
      ditherShape: DITHER_SHAPES.includes(layer.ditherShape) ? layer.ditherShape : 'circle',
      colorMode: COLOR_MODES.includes(layer.colorMode) ? layer.colorMode : 'color',
      emblem: [...FLAG_CHARGES, ...EMBLEMS].some(item => item.id === layer.emblem) ? layer.emblem : 'lion',
      imageSource: validImageSource(layer.imageSource) ? layer.imageSource : '',
      imageName: typeof layer.imageName === 'string' ? layer.imageName.slice(0, 60) : '',
      imageTint: layer.imageTint === true, mirror: layer.mirror === true, repeat: Math.round(limit(layer.repeat, 1, 5, 1)),
      text: typeof layer.text === 'string' ? layer.text.slice(0, 50) : 'FLAG', visible: layer.visible !== false, locked: layer.locked === true
    });
  });
  return { version: 2, ratio: RATIOS.includes(input.ratio) ? input.ratio : '3:2', background: color(input.background, '#e9e6da'), layers, ...normalizeMotion(input, ids) };
}

export function randomColor(except) {
  const choices = PALETTE.filter(c => c !== except);
  return choices[Math.floor(Math.random() * choices.length)];
}

export function varyLayer(layer) {
  const n = (min, max) => min + Math.random() * (max - min);
  const effect = () => Math.random() < .45 ? 0 : Math.round(n(.18, .85) * 100) / 100;
  const effects = [effect(), effect() * .45, effect() * .6, effect() * .6];
  if (effects.every(value => value === 0)) effects[Math.floor(n(0, effects.length))] = n(.25, .6);
  return {
    ...layer,
    ...(layer.type === 'image' && !layer.imageSource ? { emblem: SYMBOL_LIBRARY[Math.floor(n(0, SYMBOL_LIBRARY.length))].id, mirror: Math.random() > .5, repeat: Math.random() > .7 ? 2 : 1 } : {}),
    x: n(.15, .85), y: n(.15, .85), w: n(.18, 1.35), h: n(.18, 1.25),
    rotation: layer.type === 'image' ? 0 : Math.round(n(-180, 180) / 15) * 15,
    color: randomColor(layer.color), count: Math.round(n(3, 17)), detail: n(.12, .55), opacity: n(.65, 1),
    dither: effects[0], ditherSize: Math.round(n(.15, .85) * 100) / 100,
    ditherShape: DITHER_SHAPES[Math.floor(n(0, DITHER_SHAPES.length))],
    colorMode: COLOR_MODES[Math.floor(n(0, COLOR_MODES.length))],
    blur: effects[1], warp: effects[2], echo: effects[3]
  };
}

export function randomDocument() {
  return composeRandomFlag(makeLayer, defaultLfos);
}

export function encodeDocument(doc) {
  const bytes = new TextEncoder().encode(JSON.stringify(doc));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeDocument(value) {
  try {
    if (!value || value.length > 40000000) return null;
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return normalizeDocument(JSON.parse(new TextDecoder().decode(bytes)));
  } catch { return null; }
}
