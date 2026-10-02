import { hexToHsl, hslToHex } from './color.js?v=cd3c4e952fdb';

export const WAVES = [
  { id: 'sine', icon: '∿', name: 'Seno' },
  { id: 'triangle', icon: '⋀', name: 'Triángulo' },
  { id: 'square', icon: '⊓', name: 'Cuadrada' },
  { id: 'step', icon: '▂▅', name: 'Escalonada' }
];

export const MOD_TARGETS = [
  { id: 'x', icon: '↔', name: 'Posición horizontal', range: .38, min: -2, max: 3 },
  { id: 'y', icon: '↕', name: 'Posición vertical', range: .38, min: -2, max: 3 },
  { id: 'rotation', icon: '⟳', name: 'Giro', range: 180, min: -3600, max: 3600 },
  { id: 'w', icon: '◧', name: 'Anchura', range: .75, min: .01, max: 3 },
  { id: 'h', icon: '▤', name: 'Altura', range: .75, min: .01, max: 3 },
  { id: 'opacity', icon: '◐', name: 'Opacidad', range: .5, min: 0, max: 1 },
  { id: 'color', icon: '◉', name: 'Tono principal', range: 180 },
  { id: 'color2', icon: '◎', name: 'Tono secundario', range: 180 },
  { id: 'dither', icon: '⠿', name: 'Trama', range: .7, min: 0, max: 1 },
  { id: 'ditherSize', icon: '∙', name: 'Tamaño de trama', range: .5, min: 0, max: 1 },
  { id: 'blur', icon: '◌', name: 'Desenfoque', range: .6, min: 0, max: 1 },
  { id: 'warp', icon: '≋', name: 'Distorsión', range: .7, min: 0, max: 1 },
  { id: 'echo', icon: '◈', name: 'Eco', range: .7, min: 0, max: 1 }
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const fract = value => value - Math.floor(value);
const noise = (seed, cycle) => fract(Math.sin((cycle + seed * 17.17) * 78.233) * 43758.5453) * 2 - 1;

export function defaultLfos() {
  return [
    { id: 'a', wave: 'sine', rate: .35, phase: 0, seed: 13 },
    { id: 'b', wave: 'triangle', rate: .21, phase: .25, seed: 47 }
  ];
}

export function normalizeMotion(input, layerIds) {
  const defaults = defaultLfos();
  const lfos = defaults.map((fallback, index) => {
    const value = Array.isArray(input?.lfos) ? input.lfos[index] : null;
    return {
      id: fallback.id,
      wave: WAVES.some(wave => wave.id === value?.wave) ? value.wave : fallback.wave,
      rate: Number.isFinite(Number(value?.rate)) ? clamp(Number(value.rate), .02, 4) : fallback.rate,
      phase: Number.isFinite(Number(value?.phase)) ? clamp(Number(value.phase), 0, 1) : fallback.phase,
      seed: Number.isSafeInteger(value?.seed) ? clamp(value.seed, 0, 999999) : fallback.seed
    };
  });
  const used = new Set();
  const routes = (Array.isArray(input?.routes) ? input.routes : []).slice(0, 160).flatMap(route => {
    if (!route || !lfos.some(lfo => lfo.id === route.lfo) || !layerIds.has(route.layerId) || !MOD_TARGETS.some(target => target.id === route.target)) return [];
    const key = `${route.layerId}:${route.target}`;
    if (used.has(key)) return [];
    used.add(key);
    return [{ lfo: route.lfo, layerId: route.layerId, target: route.target, depth: Number.isFinite(Number(route.depth)) ? clamp(Number(route.depth), -1, 1) : .5 }];
  });
  return { lfos, routes };
}

export function waveValue(lfo, seconds) {
  const cycles = Math.max(0, seconds) * lfo.rate + lfo.phase;
  const p = fract(cycles);
  switch (lfo.wave) {
    case 'triangle': return 1 - 4 * Math.abs(p - .5);
    case 'square': return p < .5 ? 1 : -1;
    case 'step': return noise(lfo.seed, Math.floor(cycles));
    default: return Math.sin(p * Math.PI * 2);
  }
}

export function frameDocument(doc, seconds) {
  if (!doc.routes?.length) return doc;
  const layers = doc.layers.map(layer => ({ ...layer }));
  const byId = new Map(layers.map(layer => [layer.id, layer]));
  const lfos = new Map(doc.lfos.map(lfo => [lfo.id, lfo]));
  for (const route of doc.routes) {
    const layer = byId.get(route.layerId);
    const lfo = lfos.get(route.lfo);
    const target = MOD_TARGETS.find(item => item.id === route.target);
    if (!layer || !lfo || !target) continue;
    const offset = waveValue(lfo, seconds) * route.depth * target.range;
    if (route.target === 'color' || route.target === 'color2') {
      const { h, s, l } = hexToHsl(layer[route.target]);
      layer[route.target] = hslToHex((h + offset + 360) % 360, s, l);
    } else layer[route.target] = clamp(layer[route.target] + offset, target.min, target.max);
  }
  return { ...doc, layers };
}
