import { emblemById, validImageSource } from './emblems.js?v=96d262b3f08d';
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const num = value => Number(value.toFixed(3));

export function dimensions(ratio) {
  const [a, b] = ratio.split(':').map(Number);
  return { width: 900, height: 900 * b / a };
}

function starPoints(points, outerX, outerY, innerRatio) {
  const vertices = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / points;
    const r = i % 2 ? innerRatio : 1;
    vertices.push(`${num(Math.cos(angle) * outerX * r)},${num(Math.sin(angle) * outerY * r)}`);
  }
  return vertices.join(' ');
}

function shape(layer, w, h) {
  const x = -w / 2, y = -h / 2, c = esc(layer.color), c2 = esc(layer.color2);
  const count = Math.max(2, Math.min(32, Math.round(layer.count)));
  const detail = layer.detail;
  switch (layer.type) {
    case 'band': return `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" fill="${c}"/>`;
    case 'stripes': return Array.from({ length: count }, (_, i) => `<rect x="${num(x)}" y="${num(y + i * h / count)}" width="${num(w)}" height="${num(h / count + .5)}" fill="${i % 2 ? c2 : c}"/>`).join('');
    case 'cross': return `<rect x="${num(-w * detail / 2)}" y="${num(y)}" width="${num(w * detail)}" height="${num(h)}" fill="${c}"/><rect x="${num(x)}" y="${num(-h * detail / 2)}" width="${num(w)}" height="${num(h * detail)}" fill="${c}"/>`;
    case 'saltire': return `<line x1="${num(x)}" y1="${num(y)}" x2="${num(-x)}" y2="${num(-y)}" stroke="${c}" stroke-width="${num(Math.min(w, h) * detail)}"/><line x1="${num(-x)}" y1="${num(y)}" x2="${num(x)}" y2="${num(-y)}" stroke="${c}" stroke-width="${num(Math.min(w, h) * detail)}"/>`;
    case 'chevron': return `<path d="M ${num(x)} ${num(y)} L 0 ${num(h * .28)} L ${num(-x)} ${num(y)}" fill="none" stroke="${c}" stroke-width="${num(Math.min(w, h) * detail)}" stroke-linejoin="miter"/>`;
    case 'triangle': return `<polygon points="${num(x)},${num(-y)} ${num(-x)},${num(-y)} 0,${num(y)}" fill="${c}"/>`;
    case 'diamond': return `<polygon points="0,${num(y)} ${num(-x)},0 0,${num(-y)} ${num(x)},0" fill="${c}"/>`;
    case 'circle': return `<ellipse rx="${num(w / 2)}" ry="${num(h / 2)}" fill="${c}"/>`;
    case 'star': return `<polygon points="${starPoints(count, w / 2, h / 2, detail)}" fill="${c}"/>`;
    case 'sun': {
      const rays = Array.from({ length: count }, (_, i) => {
        const a = i * Math.PI * 2 / count;
        return `<line x1="${num(Math.cos(a) * w * .28)}" y1="${num(Math.sin(a) * h * .28)}" x2="${num(Math.cos(a) * w * .5)}" y2="${num(Math.sin(a) * h * .5)}" stroke="${c}" stroke-width="${num(Math.min(w, h) * detail * .19)}" stroke-linecap="round"/>`;
      }).join('');
      return `${rays}<ellipse rx="${num(w * .25)}" ry="${num(h * .25)}" fill="${c}"/>`;
    }
    case 'crescent': {
      const id = `moon-${esc(layer.id)}`;
      return `<defs><mask id="${id}"><rect x="${num(x - 1)}" y="${num(y - 1)}" width="${num(w + 2)}" height="${num(h + 2)}" fill="white"/><ellipse cx="${num(w * detail)}" cy="${num(-h * .13)}" rx="${num(w * .45)}" ry="${num(h * .45)}" fill="black"/></mask></defs><ellipse rx="${num(w / 2)}" ry="${num(h / 2)}" fill="${c}" mask="url(#${id})"/>`;
    }
    case 'rays': return Array.from({ length: count }, (_, i) => {
      const a = i * Math.PI * 2 / count;
      return `<line x1="0" y1="0" x2="${num(Math.cos(a) * w / 2)}" y2="${num(Math.sin(a) * h / 2)}" stroke="${c}" stroke-width="${num(Math.min(w, h) * detail * .28)}"/>`;
    }).join('');
    case 'dots': {
      const dots = [];
      for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
        const px = x + (col + .5) * w / count, py = y + (row + .5) * h / count;
        dots.push(`<ellipse cx="${num(px)}" cy="${num(py)}" rx="${num(w * detail / count)}" ry="${num(h * detail / count)}" fill="${c}"/>`);
      }
      return dots.join('');
    }
    case 'checks': {
      const checks = [];
      for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
        checks.push(`<rect x="${num(x + col * w / count)}" y="${num(y + row * h / count)}" width="${num(w / count + .3)}" height="${num(h / count + .3)}" fill="${(row + col) % 2 ? c2 : c}"/>`);
      }
      return checks.join('');
    }
    case 'waves': return Array.from({ length: count }, (_, row) => {
      const py = y + (row + .5) * h / count;
      let path = `M ${num(x)} ${num(py)}`;
      for (let segment = 0; segment < 8; segment++) {
        const sx = x + segment * w / 8;
        path += ` Q ${num(sx + w / 16)} ${num(py + (segment % 2 ? -1 : 1) * h * detail / count)} ${num(sx + w / 8)} ${num(py)}`;
      }
      return `<path d="${path}" fill="none" stroke="${c}" stroke-width="${num(h * .21 / count)}"/>`;
    }).join('');
    case 'image': {
      const charge = emblemById(layer.emblem);
      const source = validImageSource(layer.imageSource) ? layer.imageSource : charge.source || '';
      if (charge.asset && !source) return '';
      const id = `image-tint-${esc(layer.id)}`;
      const tint = source && layer.imageTint ? `<defs><filter id="${id}" color-interpolation-filters="sRGB"><feFlood flood-color="${c}"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>` : '';
      const content = source ? `<image href="${esc(source)}" width="100" height="100" preserveAspectRatio="none"${layer.imageTint ? ` filter="url(#${id})"` : ''}/>` : `<path d="${charge.path}" fill="${c}" fill-rule="${charge.rule || 'nonzero'}"/>`;
      const repeat = Math.max(1, Math.min(5, Math.round(layer.repeat || 1)));
      return tint + Array.from({ length: repeat * repeat }, (_, i) => {
        const cw = w / repeat, ch = h / repeat;
        return `<g transform="translate(${num(x + i % repeat * cw + (layer.mirror ? cw : 0))} ${num(y + Math.floor(i / repeat) * ch)}) scale(${num(cw / 100 * (layer.mirror ? -1 : 1))} ${num(ch / 100)})">${content}</g>`;
      }).join('');
    }
    case 'text': return `<text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-family="Arial,sans-serif" font-weight="700" font-size="${num(h * .7)}" textLength="${num(w)}" lengthAdjust="spacingAndGlyphs" fill="${c}">${esc(layer.text || 'FLAG')}</text>`;
    default: return '';
  }
}

function layerFilter(layer) {
  const blur = Math.max(0, Math.min(1, layer.blur || 0));
  const warp = Math.max(0, Math.min(1, layer.warp || 0));
  const echo = Math.max(0, Math.min(1, layer.echo || 0));
  const colorMode = layer.colorMode || 'color';
  if (!(blur || warp || echo || colorMode !== 'color')) return '';
  let current = 'SourceGraphic';
  let primitives = '';
  if (colorMode === 'gray' || colorMode === 'bw') {
    primitives += `<feColorMatrix in="${current}" type="saturate" values="0" result="gray"/>`;
    current = 'gray';
  }
  if (colorMode === 'bw') {
    primitives += `<feComponentTransfer in="${current}" result="threshold"><feFuncR type="discrete" tableValues="0 1"/><feFuncG type="discrete" tableValues="0 1"/><feFuncB type="discrete" tableValues="0 1"/></feComponentTransfer>`;
    current = 'threshold';
  }
  if (warp) {
    primitives += `<feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="3" result="warp-noise"/><feDisplacementMap in="${current}" in2="warp-noise" scale="${num(warp * 48)}" xChannelSelector="R" yChannelSelector="G" result="warped"/>`;
    current = 'warped';
  }
  if (blur) {
    primitives += `<feGaussianBlur in="${current}" stdDeviation="${num(blur * 14)}" result="blurred"/>`;
    current = 'blurred';
  }
  if (echo) {
    primitives += `<feOffset in="${current}" dx="${num(echo * 38)}" dy="${num(echo * 15)}" result="offset"/><feComponentTransfer in="offset" result="ghost"><feFuncA type="linear" slope="${num(echo * .55)}"/></feComponentTransfer><feMerge><feMergeNode in="ghost"/><feMergeNode in="${current}"/></feMerge>`;
  }
  return `<filter id="fx-${esc(layer.id)}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">${primitives}</filter>`;
}

function halftone(layer, w, h) {
  const strength = Math.max(0, Math.min(1, layer.dither || 0));
  if (!strength) return '';
  const cell = num(8 + Math.max(0, Math.min(1, layer.ditherSize ?? .5)) * 24);
  const mid = cell / 2;
  const radius = num(cell * .33);
  const shape = {
    circle: `<circle cx="${mid}" cy="${mid}" r="${radius}" fill="white"/>`,
    square: `<rect x="${num(mid - radius)}" y="${num(mid - radius)}" width="${num(radius * 2)}" height="${num(radius * 2)}" fill="white"/>`,
    diamond: `<polygon points="${mid},${num(mid - radius)} ${num(mid + radius)},${mid} ${mid},${num(mid + radius)} ${num(mid - radius)},${mid}" fill="white"/>`,
    line: `<rect x="${num(mid - cell * .12)}" y="0" width="${num(cell * .24)}" height="${cell}" fill="white"/>`
  }[layer.ditherShape] || `<circle cx="${mid}" cy="${mid}" r="${radius}" fill="white"/>`;
  const x = num(-w / 2 - 100), y = num(-h / 2 - 100), maskW = num(w + 200), maskH = num(h + 200);
  const id = esc(layer.id);
  return `<pattern id="pattern-${id}" patternUnits="userSpaceOnUse" width="${cell}" height="${cell}">${shape}</pattern><mask id="mask-${id}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="${x}" y="${y}" width="${maskW}" height="${maskH}" style="mask-type:alpha"><rect x="${x}" y="${y}" width="${maskW}" height="${maskH}" fill="white" opacity="${num(1 - strength)}"/><rect x="${x}" y="${y}" width="${maskW}" height="${maskH}" fill="url(#pattern-${id})"/></mask>`;
}

export function svgMarkup(doc, selectedId = null) {
  const { width, height } = dimensions(doc.ratio);
  const filters = doc.layers.filter(layer => layer.visible).map(layer => layerFilter(layer) + halftone(layer, layer.w * width, layer.h * height)).join('');
  const layers = doc.layers.filter(layer => layer.visible).map(layer => {
    const w = layer.w * width, h = layer.h * height;
    const transform = `translate(${num(layer.x * width)} ${num(layer.y * height)}) rotate(${num(layer.rotation)})`;
    const effect = layerFilter(layer) ? ` filter="url(#fx-${esc(layer.id)})"` : '';
    const mask = layer.dither ? ` mask="url(#mask-${esc(layer.id)})"` : '';
    return `<g data-layer-id="${esc(layer.id)}" transform="${transform}" opacity="${num(layer.opacity)}"><g${effect}${mask}>${shape(layer, w, h)}</g></g>`;
  }).join('');
  const selected = doc.layers.find(layer => layer.id === selectedId && layer.visible);
  const selection = selected ? (() => {
    const w = selected.w * width, h = selected.h * height;
    const transform = `translate(${num(selected.x * width)} ${num(selected.y * height)}) rotate(${num(selected.rotation)})`;
    const top = -h / 2;
    return `<g class="selection-ui" transform="${transform}"><rect class="selection-outline" x="${num(-w / 2)}" y="${num(top)}" width="${num(w)}" height="${num(h)}"/><line class="rotation-stem" x1="0" y1="${num(top)}" x2="0" y2="${num(top - 28)}"/><circle class="rotation-handle" data-handle="rotate" cx="0" cy="${num(top - 36)}" r="8"/><circle class="selection-handle" data-handle="resize" cx="${num(w / 2)}" cy="${num(h / 2)}" r="8"/></g>`;
  })() : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(height)}" viewBox="0 0 ${num(width)} ${num(height)}" role="img" aria-label="Bandera diseñada"><defs><clipPath id="flag-clip"><rect width="${num(width)}" height="${num(height)}"/></clipPath>${filters}</defs><rect width="${num(width)}" height="${num(height)}" fill="${esc(doc.background)}"/><g clip-path="url(#flag-clip)">${layers}</g>${selection}</svg>`;
}
