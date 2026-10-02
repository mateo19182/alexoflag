export const EFFECT_PORTS = [
  { id: 'dither', icon: '⠿', name: 'Trama', level: .55 },
  { id: 'blur', icon: '◌', name: 'Desenfoque', level: .28 },
  { id: 'warp', icon: '≋', name: 'Distorsión', level: .38 },
  { id: 'echo', icon: '◈', name: 'Eco', level: .45 }
];

const port = id => EFFECT_PORTS.find(item => item.id === id);

export function togglePatch(layer, target) {
  const effect = port(target);
  if (!effect) return false;
  layer[target] = layer[target] > 0 ? 0 : effect.level;
  return true;
}

export function routePatch(layer, from, to) {
  const destination = port(to);
  if (from === 'source') {
    if (!destination || layer[to] > 0) return false;
    layer[to] = destination.level;
    return true;
  }
  const origin = port(from);
  if (!origin || layer[from] <= 0 || from === to || (to && !destination)) return false;
  if (destination) layer[to] = Math.min(1, Math.max(.04, layer[from] * destination.level / origin.level));
  layer[from] = 0;
  return true;
}
