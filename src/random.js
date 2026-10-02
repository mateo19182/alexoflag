import { SYMBOL_LIBRARY } from './emblems.js?v=cd3c4e952fdb';
import { hexToHsl, hslToHex } from './color.js?v=cd3c4e952fdb';

const pick = (items, rng) => items[Math.floor(rng() * items.length)];
const range = (min, max, rng) => min + rng() * (max - min);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const FORMS = ['band', 'stripes', 'cross', 'saltire', 'chevron', 'triangle', 'diamond', 'circle', 'star', 'sun', 'crescent', 'rays', 'dots', 'checks', 'waves'];
const SYMBOLS = new Set(['image', 'star', 'sun', 'crescent']);
const luminance = hex => {
  const channels = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
const PALETTES = [
  ['#eee9da', '#192c3b', '#c9513c'], ['#193c39', '#f1e8cf', '#cfa746'],
  ['#862f39', '#f5ead5', '#202b3d'], ['#e2b34d', '#202b3d', '#f1e8d3'],
  ['#e6e5df', '#242424', '#96978f'], ['#232323', '#eeece2', '#a7a59c'],
  ['#394766', '#f0e3c4', '#c87358'], ['#513e58', '#f0e4d3', '#a9ba9b'],
  ['#e7d5c0', '#36666c', '#a34839'], ['#c85b42', '#f2e7cf', '#2d4341']
];
function palette(rng) {
  if (rng() < .8) return pick(PALETTES, rng);
  const hue = range(0, 360, rng), saturation = rng() < .22 ? 0 : range(.25, .65, rng);
  return [hslToHex(hue, saturation * .3, .91), hslToHex(hue, saturation, .17),
    hslToHex(hue + pick([30, 150, 180, 210], rng), saturation, range(.4, .62, rng))];
}
function beneath(layer, layers, background) {
  return [...layers].reverse().find(other => other.visible && other.opacity > .5 &&
    Math.abs(other.x - layer.x) < other.w / 2 && Math.abs(other.y - layer.y) < other.h / 2)?.color || background;
}
function inkFor(layer, layers, background, colors) {
  const field = beneath(layer, layers, background);
  return [...colors].sort((a, b) => contrast(b, field) - contrast(a, field))[0];
}
function overlap(a, b) {
  const w = Math.max(0, Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2));
  const h = Math.max(0, Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2));
  return w * h / Math.min(a.w * a.h, b.w * b.h);
}
function texture(layer, rng) {
  if (rng() > .4) return;
  const effect = pick(['dither', 'dither', 'warp', 'echo', 'blur'], rng);
  layer[effect] = range(.1, effect === 'dither' ? .5 : .2, rng);
  layer.ditherSize = range(.05, .45, rng);
  layer.ditherShape = pick(['circle', 'square', 'diamond', 'line'], rng);
}

function composeFreeFlag(makeLayer, defaultLfos, rng = Math.random) {
  const colors = palette(rng);
  const background = pick(colors, rng);
  const ratio = pick(['3:2', '5:3', '2:1', '4:3', '1:1'], rng);
  const [a, b] = ratio.split(':').map(Number), aspect = a / b;
  const count = 2 + Math.floor(rng() * 5);
  const images = rng() < .8;
  const layers = [];
  for (let i = 0; i < count; i++) {
    const image = images && (i === count - 1 || (i > 0 && rng() < .25));
    const type = image ? 'image' : pick(FORMS, rng);
    const charge = image ? pick(SYMBOL_LIBRARY, rng) : null;
    const w = range(.16, SYMBOLS.has(type) ? .48 : 1.5, rng);
    const h = image ? w * aspect / charge.ratio : range(.15, SYMBOLS.has(type) ? .75 : 1.35, rng);
    const scale = image ? Math.min(1, .7 / h) : 1;
    const layer = makeLayer(type, {
      x: range(.1, .9, rng), y: range(.1, .9, rng), w: w * scale, h: h * scale,
      rotation: image ? 0 : pick([0, 0, 0, 45, 90, 135, range(-180, 180, rng)], rng),
      count: pick([3, 4, 5, 6, 8, 12], rng), detail: range(.15, .45, rng),
      emblem: charge?.id || 'albania', imageTint: image,
      color2: pick(colors, rng), opacity: SYMBOLS.has(type) ? 1 : range(.65, 1, rng)
    });
    if (SYMBOLS.has(type)) {
      // Keep symbols on the canvas and try a few positions to avoid hiding peers.
      for (let attempt = 0; attempt < 8; attempt++) {
        layer.x = range(layer.w / 2 + .02, 1 - layer.w / 2 - .02, rng);
        layer.y = range(layer.h / 2 + .02, 1 - layer.h / 2 - .02, rng);
        if (!layers.some(other => SYMBOLS.has(other.type) && overlap(layer, other) > .45)) break;
      }
    }
    layer.color = inkFor(layer, layers, background, colors);
    if (layer.color2 === layer.color) layer.color2 = background === layer.color ? colors.find(c => c !== layer.color) : background;
    layers.push(layer);
  }
  texture(pick(layers, rng), rng);
  const lfos = defaultLfos().map(lfo => ({ ...lfo, rate: range(.08, .45, rng), phase: rng(), seed: Math.floor(rng() * 999999) }));
  const focal = pick(layers, rng);
  const targets = focal.type === 'image' ? ['dither', 'warp', 'echo', 'opacity'] : ['rotation', 'dither', 'warp', 'echo', 'opacity'];
  const routes = [{ lfo: pick(lfos, rng).id, layerId: focal.id, target: pick(targets, rng), depth: range(.12, .32, rng) }];
  return { version: 2, ratio, background, layers, lfos, routes };
}

// A broad field and a smaller charge bring back the earlier visual hierarchy.
// Dimensions and placement vary continuously rather than selecting a fixed layout.
export function composeRandomFlag(makeLayer, defaultLfos, rng = Math.random) {
  if (rng() < .25) return composeFreeFlag(makeLayer, defaultLfos, rng);
  const colors = palette(rng), [background, ink, accent] = colors;
  const ratio = pick(['3:2', '3:2', '5:3', '2:1', '4:3', '1:1'], rng);
  const [a, b] = ratio.split(':').map(Number), aspect = a / b;
  const layers = [];
  const add = (type, props) => {
    const layer = makeLayer(type, { color: ink, color2: background, ...props });
    layers.push(layer);
    return layer;
  };
  const fieldType = pick(['band', 'stripes', 'cross', 'saltire', 'chevron', 'triangle', 'waves', 'rays'], rng);
  const field = add(fieldType, { w: 1.12, h: 1.12, color: accent,
    detail: range(.12, .25, rng), count: pick([3, 5, 7, 9], rng) });
  if (fieldType === 'band') {
    const vertical = rng() < .45;
    field.w = vertical ? range(.25, .55, rng) : 1.12;
    field.h = vertical ? 1.12 : range(.25, .55, rng);
    if (vertical) field.x = range(.18, .82, rng);
    else field.y = range(.25, .75, rng);
  } else if (fieldType === 'triangle') {
    field.x = range(.1, .3, rng); field.w = range(.65, 1, rng);
    field.h = 1.45; field.rotation = 90;
  } else if (fieldType === 'cross') {
    field.x = range(.28, .6, rng); field.w = 1.5;
  } else if (['waves', 'rays'].includes(fieldType)) {
    field.opacity = .45;
  }
  const charge = rng() < .8 ? pick(SYMBOL_LIBRARY, rng) : null;
  const type = charge ? 'image' : pick(['star', 'sun', 'crescent', 'diamond', 'rays'], rng);
  const symbolAspect = charge?.ratio || 1;
  const w = Math.min(range(.25, .45, rng), range(.4, .65, rng) * symbolAspect / aspect);
  const h = w * aspect / symbolAspect;
  const centered = rng() < .55;
  const x = centered ? .5 : range(w / 2 + .06, 1 - w / 2 - .06, rng);
  const y = centered ? .5 : range(h / 2 + .06, 1 - h / 2 - .06, rng);
  const symbolInk = [...colors].sort((a, b) =>
    Math.min(contrast(b, background), contrast(b, accent)) - Math.min(contrast(a, background), contrast(a, accent)))[0];
  const backing = rng() < .3 || Math.min(contrast(symbolInk, background), contrast(symbolInk, accent)) < 2.2;
  if (backing) add(pick(['circle', 'diamond'], rng), {
    x, y, w: Math.max(w * 1.35, .48 / aspect), h: Math.max(h * 1.35, .48), color: background
  });
  const focal = add(type, { x, y, w, h, emblem: charge?.id || 'lion', imageTint: true,
    color: backing ? ink : symbolInk,
    count: type === 'star' ? pick([5, 6, 8], rng) : pick([8, 12, 16], rng), detail: range(.32, .48, rng) });
  if (rng() < .18) {
    focal.w *= .48; focal.h *= .48;
    const { id, ...repeated } = focal;
    add(type, { ...repeated, x: clamp(x - .22, focal.w / 2 + .02, 1 - focal.w / 2 - .02) });
    add(type, { ...repeated, x: clamp(x + .22, focal.w / 2 + .02, 1 - focal.w / 2 - .02) });
  }
  texture(pick(layers, rng), rng);
  const lfos = defaultLfos().map(lfo => ({ ...lfo, rate: range(.08, .45, rng), phase: rng(), seed: Math.floor(rng() * 999999) }));
  const targets = focal.type === 'image' ? ['dither', 'warp', 'echo', 'opacity'] : ['rotation', 'dither', 'warp', 'echo', 'opacity'];
  const routes = [{ lfo: pick(lfos, rng).id, layerId: focal.id, target: pick(targets, rng), depth: range(.12, .32, rng) }];
  return { version: 2, ratio, background, layers, lfos, routes };
}

// Small changes preserve the user's composition, uploads, routing and layer order.
export function mutateFlag(doc, rng = Math.random) {
  return { ...doc, layers: doc.layers.map(layer => {
    if (layer.locked || !layer.visible) return { ...layer };
    const scale = clamp(range(.8, 1.2, rng), Math.max(.01 / layer.w, .01 / layer.h), Math.min(3 / layer.w, 3 / layer.h));
    const { h, s, l } = hexToHsl(layer.color);
    const next = { ...layer,
      x: clamp(layer.x + range(-.1, .1, rng), -2, 3),
      y: clamp(layer.y + range(-.1, .1, rng), -2, 3),
      w: clamp(layer.w * scale, .01, 3), h: clamp(layer.h * scale, .01, 3),
      rotation: layer.type === 'image' ? 0 : layer.rotation + pick([-15, 0, 0, 15], rng),
      color: hslToHex(h + range(-18, 18, rng), s, clamp(l + range(-.06, .06, rng), .08, .94)),
      detail: clamp(layer.detail + range(-.05, .05, rng), .02, .95)
    };
    for (const effect of ['dither', 'blur', 'warp', 'echo']) {
      if (layer[effect]) next[effect] = clamp(layer[effect] + range(-.08, .08, rng), 0, 1);
    }
    if (rng() < .2) texture(next, rng);
    return next;
  }) };
}
