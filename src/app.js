import { SYMBOL_LIBRARY, emblemById, emblemSvg, prepareCharges } from './emblems.js?v=cd3c4e952fdb';
import { TYPES, RATIOS, DITHER_SHAPES, COLOR_MODES, initialDocument, normalizeDocument, makeLayer, varyLayer, randomDocument, encodeDocument, decodeDocument } from './model.js?v=cd3c4e952fdb';
import { mutateFlag } from './random.js?v=cd3c4e952fdb';
import { dimensions, svgMarkup } from './render.js?v=cd3c4e952fdb';
import { hexToHsl, hslToHex } from './color.js?v=cd3c4e952fdb';
import { EFFECT_PORTS, togglePatch, routePatch } from './patch.js?v=cd3c4e952fdb';
import { WAVES, MOD_TARGETS, frameDocument, waveValue } from './modulation.js?v=cd3c4e952fdb';

const $ = selector => document.querySelector(selector);
const refs = {
  surround: $('#flagSurround'), stageCenter: $('.stage-center'), layerList: $('#layerList'),
  inspector: $('#inspector'), addMenu: $('#addMenu'),
  ratio: $('#ratioSelect'), background: $('#backgroundColor'),
  ratioLabel: $('#ratioLabel'), layerCount: $('#layerCount'),
  dialog: $('#exportDialog'), undo: $('#undoBtn'), redo: $('#redoBtn'),
  panel: $('.control-panel'), pagePrev: $('#prevLayerPage'), pageNext: $('#nextLayerPage'), pageLabel: $('#layerPageLabel'),
  motion: $('#motionBank'), play: $('#playBtn'), playhead: $('#playhead'), time: $('#timeReadout')
};

function loadDocument() {
  const fromLink = new URLSearchParams(location.hash.slice(1)).get('d');
  if (fromLink) {
    const decoded = decodeDocument(fromLink);
    if (decoded) return decoded;
  }
  try {
    const stored = normalizeDocument(JSON.parse(localStorage.getItem('flag-lab-document')));
    if (stored) return stored;
  } catch { /* A blocked or empty local store is fine. */ }
  return initialDocument();
}

let doc = loadDocument();
let selectedId = doc.layers.at(-1)?.id ?? null;
let history = [JSON.stringify(doc)];
let historyIndex = 0;
let drag = null;
let knobDrag = null;
let colorDrag = null;
let patchDrag = null;
let ignorePatchClickUntil = 0;
let lastKnobTap = null;
let layerPage = 0;
let activeLfo = 'a';
let activeRoute = null;
let motionDrag = null;
let motionKnobDrag = null;
let ignoreMotionClickUntil = 0;
let playing = false;
let playhead = 0;
let lastFrame = 0;
let frameHandle = 0;
const PAGE_SIZE = 5;

const selectedLayer = () => doc.layers.find(layer => layer.id === selectedId);
const typeInfo = type => TYPES.find(item => item.id === type);
let imageReplaceId = null;
let emblemPage = 0;
let emblemCategory = 'All';
const EMBLEM_PAGE_SIZE = 12;
const label = type => typeInfo(type)?.label || type;
const icon = type => typeInfo(type)?.icon || '□';
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function commit() {
  const snapshot = JSON.stringify(doc);
  if (snapshot === history[historyIndex]) return;
  history = history.slice(0, historyIndex + 1);
  history.push(snapshot);
  if (history.length > 100) history.shift();
  historyIndex = history.length - 1;
  try { localStorage.setItem('flag-lab-document', snapshot); } catch { /* The editor still works without storage. */ }
  if (location.hash) window.history.replaceState(null, '', location.pathname + location.search);
  refs.undo.disabled = historyIndex === 0;
  refs.redo.disabled = true;
}

function restore(index) {
  if (index < 0 || index >= history.length) return;
  historyIndex = index;
  doc = JSON.parse(history[index]);
  activeRoute = null;
  if (!doc.layers.some(layer => layer.id === selectedId)) selectedId = doc.layers.at(-1)?.id ?? null;
  renderAll();
  try { localStorage.setItem('flag-lab-document', history[index]); } catch { /* Optional storage. */ }
  if (location.hash) window.history.replaceState(null, '', location.pathname + location.search);
}

function layoutPreview() {
  const { width, height } = dimensions(doc.ratio);
  const style = getComputedStyle(refs.stageCenter);
  const availableWidth = Math.max(40, refs.stageCenter.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 4);
  const availableHeight = Math.max(40, refs.stageCenter.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 8);
  refs.surround.style.width = `${Math.max(40, Math.min(availableWidth, availableHeight * width / height, 1100))}px`;
  refs.surround.style.aspectRatio = `${width}/${height}`;
}

function renderPreview() {
  refs.surround.innerHTML = svgMarkup(frameDocument(doc, playhead), selectedId);
  layoutPreview();
}

function renderLayers() {
  const reversed = [...doc.layers].reverse();
  const pages = Math.max(1, Math.ceil(reversed.length / PAGE_SIZE));
  layerPage = clamp(layerPage, 0, pages - 1);
  refs.layerList.innerHTML = reversed.slice(layerPage * PAGE_SIZE, (layerPage + 1) * PAGE_SIZE).map((layer, index) => `
    <div class="layer-row ${layer.id === selectedId ? 'selected' : ''}" data-row-id="${esc(layer.id)}" role="listitem" tabindex="0" aria-label="Capa ${esc(label(layer.type))}">
      <span class="layer-index">${String(doc.layers.length - layerPage * PAGE_SIZE - index).padStart(2, '0')}</span>
      <span class="layer-icon" aria-hidden="true">${icon(layer.type)}</span>
      <span class="layer-name">${esc(layer.type === 'image' ? layer.imageName || emblemById(layer.emblem).name : label(layer.type))}</span>
      <span class="layer-color" style="background:${layer.color}"></span>
      <span class="layer-buttons"><button data-action="lock" title="${layer.locked ? 'Unlock mutation' : 'Lock against mutation'}" aria-label="${layer.locked ? 'Unlock mutation' : 'Lock against mutation'}" aria-pressed="${layer.locked}" class="mutation-lock">${layer.locked ? '▣' : '▢'}</button><button data-action="visibility" aria-label="${layer.visible ? 'Ocultar' : 'Mostrar'} capa" class="${layer.visible ? '' : 'hidden-layer'}">${layer.visible ? '◉' : '◎'}</button><button data-action="up" aria-label="Subir capa">↑</button><button data-action="down" aria-label="Bajar capa">↓</button></span>
    </div>`).join('') || '<div class="inspector-empty" aria-label="Sin capas">◇</div>';
  refs.layerCount.textContent = String(doc.layers.length).padStart(2, '0');
  refs.pageLabel.textContent = `${String(layerPage + 1).padStart(2, '0')}/${String(pages).padStart(2, '0')}`;
  refs.pagePrev.disabled = layerPage === 0;
  refs.pageNext.disabled = layerPage === pages - 1;
}

function knob(param, name, glyph, min, max, value, unit = '') {
  const cue = { x: 'X', y: 'Y', rotation: 'Rotate', w: 'Width', h: 'Height', opacity: 'Opacity', count: 'Count', detail: 'Detail', dither: 'Dither', ditherSize: 'Grain', blur: 'Blur', warp: 'Warp', echo: 'Echo', depth: 'Depth' }[param] || (param.startsWith('rate-') ? 'Rate' : 'Phase');
  const turn = -135 + (value - min) / (max - min) * 270;
  return `<div class="knob-unit" title="${name}. Double click to reset"><span class="knob-glyph" aria-hidden="true">${glyph}<small>${cue}</small></span><div class="knob-body" style="--turn:${turn}deg"><input type="range" min="${min}" max="${max}" step="1" value="${value}" data-param="${param}" aria-label="${name}"/></div><output data-output="${param}">${value}${unit}</output></div>`;
}

function colorJoystick(param, name, color) {
  const { h, s, l } = hexToHsl(color);
  const angle = h * Math.PI / 180;
  const x = Math.sin(angle) * s * 41;
  const y = -Math.cos(angle) * s * 41;
  return `<div class="color-joystick" data-color-param="${param}" style="--color:${color};--hue:${h};--x:${x}%;--y:${y}%">
    <div class="color-disc" role="slider" tabindex="0" aria-label="${name}: tono y saturación" aria-valuemin="0" aria-valuemax="360" aria-valuenow="${Math.round(h)}" aria-valuetext="Tono ${Math.round(h)} grados, saturación ${Math.round(s * 100)} por ciento" title="Arrastra: tono y saturación"><span class="color-puck"></span></div>
    <input class="color-lightness" type="range" min="0" max="100" value="${Math.round(l * 100)}" aria-label="${name}: luminosidad" title="Luminosidad" style="--level:${l * 100}%"/>
  </div>`;
}

function paintJoystick(joystick, color) {
  const { h, s, l } = hexToHsl(color);
  const angle = h * Math.PI / 180;
  joystick.style.setProperty('--color', color);
  joystick.style.setProperty('--hue', h);
  joystick.style.setProperty('--x', `${Math.sin(angle) * s * 41}%`);
  joystick.style.setProperty('--y', `${-Math.cos(angle) * s * 41}%`);
  const disc = joystick.querySelector('.color-disc');
  disc.setAttribute('aria-valuenow', String(Math.round(h)));
  disc.setAttribute('aria-valuetext', `Tono ${Math.round(h)} grados, saturación ${Math.round(s * 100)} por ciento`);
  const lightness = joystick.querySelector('.color-lightness');
  lightness.value = Math.round(l * 100);
  lightness.style.setProperty('--level', `${l * 100}%`);
}

function setJoystickColor(joystick, color) {
  const param = joystick.dataset.colorParam;
  if (param === 'background') doc.background = color;
  else if (selectedLayer()) selectedLayer()[param] = color;
  paintJoystick(joystick, color);
  renderPreview();
  if (param !== 'background') {
    const swatch = refs.layerList.querySelector('.layer-row.selected .layer-color');
    if (swatch && param === 'color') swatch.style.background = color;
  }
}

function moveColorDisc(event, joystick) {
  const bounds = joystick.querySelector('.color-disc').getBoundingClientRect();
  const dx = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2);
  const dy = (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2);
  const { h: oldHue, l } = hexToHsl(joystick.style.getPropertyValue('--color'));
  const saturation = clamp(Math.hypot(dx, dy), 0, 1);
  const hue = saturation < .03 ? oldHue : (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  setJoystickColor(joystick, hslToHex(hue, saturation, l));
}

function drawPatchBay() {
  const bay = refs.inspector.querySelector('.patch-bay');
  const layer = selectedLayer();
  if (!bay || !layer || !bay.clientWidth) return;
  const svg = bay.querySelector('.patch-wires');
  const bounds = bay.getBoundingClientRect();
  const point = element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2 - bounds.left, y: rect.top + rect.height / 2 - bounds.top };
  };
  const source = point(bay.querySelector('[data-patch-port="source"]'));
  const path = (end, index) => {
    const bend = 17 + index * 4;
    const dx = end.x - source.x;
    return `M ${source.x} ${source.y} C ${source.x + dx * .3} ${source.y + bend}, ${source.x + dx * .72} ${end.y + bend}, ${end.x} ${end.y}`;
  };
  svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
  let wires = EFFECT_PORTS.map((effect, index) => {
    const end = point(bay.querySelector(`[data-patch-port="${effect.id}"]`));
    const route = path(end, index);
    return `<path class="patch-trace" d="${route}"/>${layer[effect.id] > 0 ? `<path class="patch-cord" d="${route}"/><path class="patch-cord-light" d="${route}"/>` : ''}`;
  }).join('');
  if (patchDrag?.moved) {
    const end = patchDrag.point;
    const start = point(patchDrag.port);
    const dx = end.x - start.x;
    const route = `M ${start.x} ${start.y} C ${start.x + dx * .28} ${start.y + 28}, ${start.x + dx * .75} ${end.y + 28}, ${end.x} ${end.y}`;
    wires += `<path class="patch-cord patch-cord-live" d="${route}"/>`;
  }
  svg.innerHTML = wires;
}

function syncPatchBay() {
  const layer = selectedLayer();
  if (!layer) return;
  for (const effect of EFFECT_PORTS) {
    const jack = refs.inspector.querySelector(`[data-patch-port="${effect.id}"]`);
    if (!jack) continue;
    jack.classList.toggle('patched', layer[effect.id] > 0);
    jack.setAttribute('aria-pressed', String(layer[effect.id] > 0));
  }
  drawPatchBay();
}

function renderInspector() {
  const layer = selectedLayer();
  $('#editorCaption').textContent = layer ? `${layer.type === 'image' ? layer.imageName || emblemById(layer.emblem).name : label(layer.type)} / controls` : 'Choose a layer';
  if (!layer) {
    refs.inspector.innerHTML = '<div class="inspector-empty" aria-label="Selecciona una capa">✳ ◇ ✳</div>';
    return;
  }
  const countTypes = ['stripes', 'star', 'sun', 'rays', 'dots', 'checks', 'waves'];
  const detailTypes = ['cross', 'saltire', 'chevron', 'star', 'sun', 'crescent', 'rays', 'dots', 'waves'];
  refs.inspector.innerHTML = `
    <div class="oscillator-bank"><span class="bank-caption">Shape / color</span>
    <div class="type-grid" role="group" aria-label="Forma de la capa">${TYPES.map(type => `<button class="type-key ${type.id === layer.type ? 'active' : ''}" data-type="${type.id}" aria-label="${type.label}" aria-pressed="${type.id === layer.type}">${type.icon}${type.id === 'image' ? '<small>Image</small>' : ''}</button>`).join('')}</div>
    ${layer.type === 'image' ? `<div class="image-controls"><button data-image-choose title="Choose symbol or upload">${layer.imageSource ? '▧' : emblemSvg(layer.emblem)}<small>Replace</small></button><button data-image-option="mirror" aria-pressed="${layer.mirror}" title="Mirror">↔</button><button data-image-option="imageTint" ${layer.imageSource || emblemById(layer.emblem).asset ? '' : 'disabled'} aria-pressed="${layer.imageTint}" title="Turn uploaded image into a silhouette">◐<small>Tint</small></button><button data-image-repeat title="Repeat symbol">${layer.repeat}×</button></div>` : ''}
    ${layer.type === 'text' ? `<input class="text-socket" type="text" maxlength="50" value="${esc(layer.text)}" data-param="text" aria-label="Texto de la capa"/>` : ''}
    <div class="color-pair" title="${layer.type === 'image' ? 'Enable Tint to recolor this image' : 'Drag the discs for hue and saturation; sliders control brightness'}">${colorJoystick('color', 'Color principal', layer.color)}${colorJoystick('color2', 'Color secundario', layer.color2)}</div>
    <div class="inspector-actions"><button data-inspector-action="duplicate" aria-label="Duplicar capa">⧉</button><button data-inspector-action="delete" aria-label="Eliminar capa">×</button></div>
    </div>
    <div class="geometry-bank"><span class="bank-caption">Position / size</span>
    <div class="knob-grid">
      ${knob('x', 'Posición horizontal', '↔', -50, 150, Math.round(layer.x * 100), '%')}
      ${knob('y', 'Posición vertical', '↕', -50, 150, Math.round(layer.y * 100), '%')}
      ${knob('rotation', 'Giro', '⟳', -180, 180, Math.round(layer.rotation), '°')}
      ${knob('w', 'Anchura', '◧', 1, 250, Math.round(layer.w * 100), '%')}
      ${knob('h', 'Altura', '▤', 1, 250, Math.round(layer.h * 100), '%')}
      ${knob('opacity', 'Opacidad', '◐', 0, 100, Math.round(layer.opacity * 100), '%')}
      ${countTypes.includes(layer.type) ? knob('count', 'Número', '⠿', 2, 32, layer.count) : ''}
      ${detailTypes.includes(layer.type) ? knob('detail', 'Detalle', '✳', 2, 95, Math.round(layer.detail * 100), '%') : ''}
    </div>
    </div>
    <div class="texture-bank"><span class="bank-caption">Effects / drag a cable to connect</span>
    <div class="patch-bay" role="group" aria-label="Conexiones de efectos">
      <svg class="patch-wires" aria-hidden="true"></svg>
      <button class="patch-port patch-source" data-patch-port="source" aria-label="Salida de capa ${esc(label(layer.type))}" title="Arrastra hacia un efecto">${icon(layer.type)}</button>
      <div class="patch-targets">${EFFECT_PORTS.map(effect => `<button class="patch-port patch-target ${layer[effect.id] > 0 ? 'patched' : ''}" data-patch-port="${effect.id}" aria-label="${effect.name}" aria-pressed="${layer[effect.id] > 0}" title="${effect.name}">${effect.icon}</button>`).join('')}</div>
    </div>
    <div class="effects-bank" role="group" aria-label="Efectos de capa">
      ${knob('dither', 'Trama', '⠿', 0, 100, Math.round(layer.dither * 100))}
      ${knob('ditherSize', 'Tamaño de trama', '∙', 0, 100, Math.round(layer.ditherSize * 100))}
      ${knob('blur', 'Desenfoque', '◌', 0, 100, Math.round(layer.blur * 100))}
      ${knob('warp', 'Distorsión', '≋', 0, 100, Math.round(layer.warp * 100))}
      ${knob('echo', 'Eco', '◈', 0, 100, Math.round(layer.echo * 100))}
    </div>
    <div class="effect-selectors"><div class="pattern-grid" title="Dither shape" role="group" aria-label="Forma de la trama">${DITHER_SHAPES.map((shape, index) => `<button data-dither-shape="${shape}" class="pattern-key ${layer.ditherShape === shape ? 'active' : ''}" aria-label="${['Círculos', 'Cuadrados', 'Rombos', 'Barras'][index]}" aria-pressed="${layer.ditherShape === shape}">${['●', '■', '◆', '▥'][index]}</button>`).join('')}</div><div class="mode-grid" role="group" aria-label="Modo de color">${COLOR_MODES.map((mode, index) => `<button data-color-mode="${mode}" class="mode-key ${layer.colorMode === mode ? 'active' : ''}" aria-label="${['Color', 'Escala de grises', 'Blanco y negro'][index]}" aria-pressed="${layer.colorMode === mode}">${['◉', '◐', '◑'][index]}<small>${['Color', 'Gray', 'B/W'][index]}</small></button>`).join('')}</div></div>
    </div>`;
  requestAnimationFrame(drawPatchBay);
}

function setPlayhead(seconds) {
  playhead = Math.max(0, seconds);
  refs.playhead.value = Math.round(playhead % 8 * 100);
  const whole = Math.floor(playhead);
  refs.time.textContent = `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
  renderPreview();
}

function tick(now) {
  if (!playing) return;
  if (lastFrame && now - lastFrame >= 30) {
    setPlayhead(playhead + Math.min((now - lastFrame) / 1000, .15));
    lastFrame = now;
    const needle = refs.motion.querySelector('.mod-scope-needle');
    if (needle) needle.style.left = `${playhead % 8 / 8 * 100}%`;
  } else if (!lastFrame) lastFrame = now;
  frameHandle = requestAnimationFrame(tick);
}

function setPlaying(value) {
  playing = value;
  refs.play.textContent = playing ? 'Ⅱ' : '▷';
  refs.play.setAttribute('aria-label', playing ? 'Pausar animación' : 'Reproducir animación');
  refs.play.setAttribute('aria-pressed', String(playing));
  cancelAnimationFrame(frameHandle);
  lastFrame = 0;
  if (playing) frameHandle = requestAnimationFrame(tick);
}

function drawMotionBay() {
  const bay = refs.motion.querySelector('.mod-patch-bay');
  if (!bay || !bay.clientWidth) return;
  const bounds = bay.getBoundingClientRect();
  const point = element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2 - bounds.left, y: rect.top + rect.height / 2 - bounds.top };
  };
  const svg = bay.querySelector('.mod-wires');
  svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
  let lines = doc.routes.filter(route => route.layerId === selectedId).map(route => {
    const source = bay.querySelector(`[data-mod-source="${route.lfo}"]`);
    const target = bay.querySelector(`[data-mod-target="${route.target}"]`);
    if (!source || !target) return '';
    const a = point(source), b = point(target), middle = (a.y + b.y) / 2;
    const d = `M ${a.x} ${a.y} C ${a.x} ${middle}, ${b.x} ${middle}, ${b.x} ${b.y}`;
    return `<path class="mod-cord ${route.target === activeRoute ? 'selected' : ''}" d="${d}"/><path class="mod-cord-light" d="${d}"/>`;
  }).join('');
  if (motionDrag?.moved) {
    const a = point(motionDrag.port), b = motionDrag.point;
    const middle = (a.y + b.y) / 2;
    lines += `<path class="mod-cord live" d="M ${a.x} ${a.y} C ${a.x} ${middle}, ${b.x} ${middle}, ${b.x} ${b.y}"/>`;
  }
  svg.innerHTML = lines;
}

function renderMotion() {
  const layer = selectedLayer();
  const routes = doc.routes.filter(route => route.layerId === selectedId);
  if (!routes.some(route => route.target === activeRoute)) activeRoute = routes[0]?.target ?? null;
  const route = routes.find(item => item.target === activeRoute);
  refs.motion.innerHTML = `<div class="mod-patch-bay" role="group" aria-label="Conexiones de osciladores">
    <svg class="mod-wires" aria-hidden="true"></svg>
    <div class="mod-sources">${doc.lfos.map(lfo => `<div class="mod-source-card ${activeLfo === lfo.id ? 'active' : ''}" data-lfo-card="${lfo.id}">
      <button class="mod-port mod-source-port" data-mod-source="${lfo.id}" aria-label="Salida del oscilador ${lfo.id.toUpperCase()}" aria-pressed="${activeLfo === lfo.id}">${lfo.id.toUpperCase()}</button>
      <div class="mod-wave-keys" role="group" aria-label="Forma del oscilador ${lfo.id.toUpperCase()}">${WAVES.map(wave => `<button data-wave="${wave.id}" data-lfo="${lfo.id}" aria-label="${wave.name}" aria-pressed="${lfo.wave === wave.id}" class="${lfo.wave === wave.id ? 'active' : ''}">${wave.icon}</button>`).join('')}</div>
      <div class="mod-rate">${knob(`rate-${lfo.id}`, `Velocidad ${lfo.id.toUpperCase()}`, '◷', 2, 400, Math.round(lfo.rate * 100))}${knob(`phase-${lfo.id}`, `Fase ${lfo.id.toUpperCase()}`, '◔', 0, 100, Math.round(lfo.phase * 100))}</div>
    </div>`).join('')}</div>
    <div class="mod-scope" aria-hidden="true"><svg viewBox="0 0 400 70" preserveAspectRatio="none">${doc.lfos.map((lfo, index) => {
      const mid = index ? 51 : 19;
      const path = Array.from({ length: 121 }, (_, sample) => `${sample ? 'L' : 'M'} ${sample * 400 / 120} ${mid - waveValue(lfo, sample * 8 / 120) * 11}`).join(' ');
      return `<path d="${path}" class="mod-wave-line mod-wave-${lfo.id}"/>`;
    }).join('')}</svg><i class="mod-scope-needle" style="left:${playhead % 8 / 8 * 100}%"></i></div>
    <div class="mod-targets" role="group" aria-label="Destinos de la capa ${layer ? esc(label(layer.type)) : ''}">${MOD_TARGETS.map(target => {
      const connected = routes.find(item => item.target === target.id);
      const cue = {x:'X',y:'Y',rotation:'Rotate',w:'Width',h:'Height',opacity:'Opacity',color:'Hue 1',color2:'Hue 2',dither:'Dither',ditherSize:'Grain',blur:'Blur',warp:'Warp',echo:'Echo'}[target.id];
      return `<span class="mod-target-cell"><button class="mod-port mod-target-port ${connected ? 'connected' : ''} ${activeRoute === target.id ? 'selected' : ''}" data-mod-target="${target.id}" title="${target.name}" aria-label="${target.name}${connected ? `, oscilador ${connected.lfo.toUpperCase()}` : ''}" aria-pressed="${!!connected}" ${layer ? '' : 'disabled'}>${target.icon}</button><small>${cue}</small></span>`;
    }).join('')}</div>
  </div><div class="mod-footer"><span class="mod-footer-glyph" aria-hidden="true">${route ? `${route.lfo.toUpperCase()} ─ ${MOD_TARGETS.find(target => target.id === route.target)?.icon}` : 'A / B →'}</span>${route ? knob('depth', 'Profundidad de modulación', '∿', -100, 100, Math.round(route.depth * 100)) : '<span class="mod-empty">Drag A or B to a parameter below</span>'}<button class="mod-remove" data-mod-remove aria-label="Desconectar cable" ${route ? '' : 'disabled'}>×</button></div>`;
  requestAnimationFrame(drawMotionBay);
}

function connectMotion(lfo, target) {
  if (!selectedLayer() || !doc.lfos.some(item => item.id === lfo) || !MOD_TARGETS.some(item => item.id === target)) return;
  doc.routes = doc.routes.filter(route => route.layerId !== selectedId || route.target !== target);
  doc.routes.push({ lfo, layerId: selectedId, target, depth: .5 });
  activeLfo = lfo;
  activeRoute = target;
  commit(); renderMotion(); renderPreview();
}

function removeMotion(target) {
  const oldLength = doc.routes.length;
  doc.routes = doc.routes.filter(route => route.layerId !== selectedId || route.target !== target);
  if (doc.routes.length === oldLength) return;
  activeRoute = null;
  commit(); renderMotion(); renderPreview();
}

function renderAll() {
  if (doc.layers.some(layer => layer.type === 'image' && !layer.imageSource && emblemById(layer.emblem).asset && !emblemById(layer.emblem).source)) {
    prepareCharges(doc.layers).then(() => { renderPreview(); renderInspector(); }).catch(() => {});
  }
  refs.ratio.innerHTML = RATIOS.map(value => { const [w, h] = value.split(':').map(Number); const scale = 25 / Math.max(w, h); return `<button class="ratio-key ${doc.ratio === value ? 'active' : ''}" data-ratio="${value}" aria-label="Proporción ${value}" aria-pressed="${doc.ratio === value}"><span class="ratio-shape" style="--rw:${Math.round(w * scale)}px;--rh:${Math.round(h * scale)}px"></span></button>`; }).join('');
  refs.background.innerHTML = colorJoystick('background', 'Color del fondo', doc.background);
  refs.ratioLabel.textContent = doc.ratio;
  refs.undo.disabled = historyIndex === 0;
  refs.redo.disabled = historyIndex === history.length - 1;
  renderPreview(); renderLayers(); renderInspector(); renderMotion();
}

function select(id) {
  selectedId = id;
  const reverseIndex = [...doc.layers].reverse().findIndex(layer => layer.id === id);
  if (reverseIndex >= 0) layerPage = Math.floor(reverseIndex / PAGE_SIZE);
  renderPreview(); renderLayers(); renderInspector(); renderMotion();
}

function renderImageLibrary() {
  const query = $('#emblemSearch').value.trim().toLowerCase();
  const items = SYMBOL_LIBRARY.filter(item => (emblemCategory === 'All' || item.category === emblemCategory) && item.name.toLowerCase().includes(query));
  const pages = Math.max(1, Math.ceil(items.length / EMBLEM_PAGE_SIZE));
  emblemPage = clamp(emblemPage, 0, pages - 1);
  $('#emblemGrid').innerHTML = items.slice(emblemPage * EMBLEM_PAGE_SIZE, (emblemPage + 1) * EMBLEM_PAGE_SIZE).map(item => `<button data-emblem="${item.id}" title="${item.name}">${emblemSvg(item.id)}<span>${item.name}</span></button>`).join('') || '<div class="library-empty">No matching symbols</div>';
  $('#emblemPage').textContent = `${emblemPage + 1} / ${pages} · ${items.length}`;
  $('#prevEmblems').disabled = emblemPage === 0;
  $('#nextEmblems').disabled = emblemPage === pages - 1;
  for (const button of $('#emblemCategories').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.category === emblemCategory));
}

function openImages(replaceId = null) {
  if (!replaceId && doc.layers.length >= 80) return;
  imageReplaceId = replaceId;
  renderImageLibrary();
  $('#imageDialog').showModal();
}

function insertImage(properties) {
  const existing = doc.layers.find(layer => layer.id === imageReplaceId);
  if (existing) Object.assign(existing, { type: 'image' }, properties);
  else {
    if (doc.layers.length >= 80) return;
    const layer = makeLayer('image', properties);
    doc.layers.push(layer); selectedId = layer.id; layerPage = 0;
  }
  $('#imageDialog').close(); refs.addMenu.hidden = true;
  commit(); renderAll();
}

async function uploadImage(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 15000000) return;
  const url = URL.createObjectURL(file);
  const button = $('#uploadImage'); button.disabled = true;
  try {
    const image = new Image(); image.src = url; await image.decode();
    const side = 384, scale = side / Math.max(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    // Rasterize uploads so SVG scripts and external references never enter documents.
    const imageSource = canvas.toDataURL('image/webp', .8);
    if (imageSource.length > 350000) throw new Error('Image too detailed');
    const size = .42;
    const { width, height } = dimensions(doc.ratio);
    insertImage({ imageSource, imageName: file.name.slice(0, 60), imageTint: false,
      w: size * canvas.width / Math.max(canvas.width, canvas.height),
      h: size * width / height * canvas.height / Math.max(canvas.width, canvas.height) });
    
  } catch {  }
  finally { URL.revokeObjectURL(url); button.disabled = false; }
}

function addLayer(type) {
  if (type === 'image') return openImages();
  if (doc.layers.length >= 80) return;
  const layer = makeLayer(type);
  doc.layers.push(layer);
  selectedId = layer.id;
  layerPage = 0;
  refs.addMenu.hidden = true;
  commit(); renderAll();
  
}

function removeSelected() {
  if (!selectedId) return;
  const index = doc.layers.findIndex(layer => layer.id === selectedId);
  if (index < 0) return;
  doc.layers.splice(index, 1);
  doc.routes = doc.routes.filter(route => route.layerId !== selectedId);
  selectedId = doc.layers[Math.min(index, doc.layers.length - 1)]?.id ?? null;
  commit(); renderAll();
}

function duplicateSelected() {
  const layer = selectedLayer();
  if (!layer || doc.layers.length >= 80) return;
  const index = doc.layers.indexOf(layer);
  const copy = { ...layer, id: crypto.randomUUID(), x: clamp(layer.x + .055, -2, 3), y: clamp(layer.y + .055, -2, 3) };
  doc.layers.splice(index + 1, 0, copy);
  doc.routes.push(...doc.routes.filter(route => route.layerId === layer.id).map(route => ({ ...route, layerId: copy.id })));
  selectedId = copy.id;
  commit(); renderAll();
}

function svgPoint(event) {
  const box = refs.surround.getBoundingClientRect();
  const { width, height } = dimensions(doc.ratio);
  return { x: (event.clientX - box.left) * width / box.width, y: (event.clientY - box.top) * height / box.height };
}

function startDrag(event) {
  if (event.button !== 0) return;
  const handle = event.target.closest('[data-handle]');
  const hit = event.target.closest('[data-layer-id]');
  if (handle && selectedLayer()) {
    drag = { kind: handle.dataset.handle, id: selectedId, start: svgPoint(event), original: { ...selectedLayer() } };
  } else if (hit) {
    const id = hit.dataset.layerId;
    if (id !== selectedId) select(id);
    drag = { kind: 'move', id, start: svgPoint(event), original: { ...selectedLayer() } };
  } else { select(null); return; }
  event.preventDefault();
  refs.surround.setPointerCapture(event.pointerId);
}

function moveDrag(event) {
  if (!drag) return;
  const layer = doc.layers.find(item => item.id === drag.id);
  if (!layer) return;
  const p = svgPoint(event), { width, height } = dimensions(doc.ratio);
  const center = { x: drag.original.x * width, y: drag.original.y * height };
  if (drag.kind === 'move') {
    layer.x = clamp(drag.original.x + (p.x - drag.start.x) / width, -2, 3);
    layer.y = clamp(drag.original.y + (p.y - drag.start.y) / height, -2, 3);
  } else if (drag.kind === 'rotate') {
    const startAngle = Math.atan2(drag.start.y - center.y, drag.start.x - center.x);
    const angle = Math.atan2(p.y - center.y, p.x - center.x);
    layer.rotation = Math.round(drag.original.rotation + (angle - startAngle) * 180 / Math.PI);
  } else if (drag.kind === 'resize') {
    const startDistance = Math.hypot(drag.start.x - center.x, drag.start.y - center.y);
    const distance = Math.hypot(p.x - center.x, p.y - center.y);
    const factor = clamp(distance / Math.max(1, startDistance), .02, 20);
    layer.w = clamp(drag.original.w * factor, .01, 3);
    layer.h = clamp(drag.original.h * factor, .01, 3);
  }
  renderPreview();
}

function finishDrag(event) {
  if (!drag) return;
  if (refs.surround.hasPointerCapture(event.pointerId)) refs.surround.releasePointerCapture(event.pointerId);
  drag = null;
  commit(); renderAll();
}

async function share() {
  const url = new URL(location.href);
  url.hash = `d=${encodeDocument(doc)}`;
  try {
    await navigator.clipboard.writeText(url.href);
    window.history.replaceState(null, '', url.href);
    
  } catch {
    const input = document.createElement('textarea');
    input.value = url.href; document.body.append(input); input.select();
    const copied = document.execCommand('copy'); input.remove();
    if (copied) { window.history.replaceState(null, '', url.href);  }
    
  }
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportSvg() {
  await prepareCharges(doc.layers);
  download(new Blob([svgMarkup(frameDocument(doc, playhead))], { type: 'image/svg+xml;charset=utf-8' }), 'flag-lab.svg');
  refs.dialog.close(); 
}

async function exportPng() {
  await prepareCharges(doc.layers);
  const markup = svgMarkup(frameDocument(doc, playhead));
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
    const { width, height } = dimensions(doc.ratio);
    const canvas = document.createElement('canvas'); canvas.width = 2400; canvas.height = Math.round(2400 * height / width);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG unavailable');
    download(blob, 'flag-lab.png'); refs.dialog.close(); 
  } catch {  }
  finally { URL.revokeObjectURL(url); }
}

async function drawVideoFrame(ctx, frame, width, height) {
  const markup = svgMarkup(frameDocument(doc, frame));
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
    ctx.drawImage(img, 0, 0, width, height);
  } finally { URL.revokeObjectURL(url); }
}

async function exportWebm() {
  await prepareCharges(doc.layers);
  const button = $('#downloadWebm');
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return;
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
  if (!mime) return;
  button.disabled = true;
  button.querySelector('small').textContent = '●';
  const canvas = document.createElement('canvas');
  const size = dimensions(doc.ratio);
  canvas.width = 1200;
  canvas.height = Math.round(1200 * size.height / size.width);
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0];
  const chunks = [];
  let recorder;
  try {
    await drawVideoFrame(ctx, 0, canvas.width, canvas.height);
    track.requestFrame();
    recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4500000 });
    const stopped = new Promise((resolve, reject) => { recorder.onstop = resolve; recorder.onerror = reject; });
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.start();
    const start = performance.now();
    for (let frame = 1; frame <= 144; frame++) {
      const wait = start + frame * 1000 / 24 - performance.now();
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
      await drawVideoFrame(ctx, frame / 24, canvas.width, canvas.height);
      track.requestFrame();
    }
    recorder.stop();
    await stopped;
    if (!chunks.length) throw new Error('Empty recording');
    download(new Blob(chunks, { type: mime }), 'flag-lab.webm');
    refs.dialog.close(); 
  } catch { if (recorder?.state === 'recording') recorder.stop();  }
  finally { stream.getTracks().forEach(item => item.stop()); button.disabled = false; button.querySelector('small').textContent = 'WEBM'; }
}

function resetKnob(input) {
  const layer = selectedLayer();
  if (!layer) return;
  const param = input.dataset.param;
  const defaults = makeLayer(layer.type);
  if (!(param in defaults)) return;
  layer[param] = defaults[param];
  knobDrag = null;
  commit();
  renderAll();
}

function resetMotionKnob(input) {
  const param = input.dataset.param;
  if (param === 'depth') {
    const route = doc.routes.find(item => item.layerId === selectedId && item.target === activeRoute);
    if (!route) return;
    route.depth = .5;
  } else {
    const [key, id] = param.split('-');
    const lfo = doc.lfos.find(item => item.id === id);
    if (!lfo) return;
    lfo[key] = key === 'rate' ? (id === 'a' ? .35 : .21) : (id === 'a' ? 0 : .25);
  }
  motionKnobDrag = null;
  commit(); renderMotion(); renderPreview();
}

function init() {
  refs.addMenu.innerHTML = `<div class="add-menu-head"><span>Add layer</span><button data-close-add aria-label="Close add layer">×</button></div><div class="add-shape-grid">${TYPES.filter(type => type.id !== 'image').map(type => `<button data-add-type="${type.id}" aria-label="Add ${type.label}" title="${type.label}">${type.icon}</button>`).join('')}</div><button data-add-type="image" class="add-image-entry" aria-label="Add image or symbol"><span aria-hidden="true">▧</span><span>Image / symbol</span><span aria-hidden="true">→</span></button>`;
  const categories = [['All','✳'],['Animals','♞'],['Celestial','☼'],['Plants','❧'],['Weapons','⚔'],['Symbols','◇']];
  $('#emblemCategories').innerHTML = categories.map(([name, glyph]) => `<button data-category="${name}" aria-label="${name}" title="${name}" aria-pressed="${name === 'All'}">${glyph}</button>`).join('');
  $('#emblemSearch').addEventListener('input', () => { emblemPage = 0; renderImageLibrary(); });
  $('#emblemCategories').addEventListener('click', event => {
    const category = event.target.closest('[data-category]')?.dataset.category;
    if (category) { emblemCategory = category; emblemPage = 0; renderImageLibrary(); }
  });
  $('#prevEmblems').addEventListener('click', () => { emblemPage--; renderImageLibrary(); });
  $('#nextEmblems').addEventListener('click', () => { emblemPage++; renderImageLibrary(); });
  $('#imagesBtn').addEventListener('click', () => openImages());
  $('#closeImages').addEventListener('click', () => $('#imageDialog').close());
  $('#uploadImage').addEventListener('click', () => $('#imageUpload').click());
  $('#imageUpload').addEventListener('change', uploadImage);
  $('#emblemGrid').addEventListener('click', event => {
    const id = event.target.closest('[data-emblem]')?.dataset.emblem;
    if (id) {
      const charge = emblemById(id), size = .45, aspect = charge.ratio || 1;
      const { width, height } = dimensions(doc.ratio);
      insertImage({ emblem: id, imageSource: '', imageName: '', imageTint: true,
        w: size * Math.min(1, aspect), h: size * width / height * Math.min(1, 1 / aspect) });
    }
  });
  const hints = () => document.querySelectorAll('button[aria-label]').forEach(button => { if (!button.title) button.title = button.getAttribute('aria-label'); });
  new MutationObserver(hints).observe(refs.panel, { childList: true, subtree: true });
  renderAll(); hints();
  new ResizeObserver(layoutPreview).observe(refs.stageCenter);

  function setDeck(deck) {
    refs.panel.dataset.deck = deck;
    $('#editorCaption').textContent = deck === 'motion' ? 'Animation / connect A or B to a parameter' : (selectedLayer() ? `${selectedLayer().type === 'image' ? selectedLayer().imageName || emblemById(selectedLayer().emblem).name : label(selectedLayer().type)} / controls` : 'Choose a layer');
    for (const button of document.querySelectorAll('[data-deck-target]')) button.setAttribute('aria-pressed', String(button.dataset.deckTarget === deck));
    refs.addMenu.hidden = true;
    requestAnimationFrame(() => { drawPatchBay(); drawMotionBay(); });
  }
  refs.play.addEventListener('click', () => setPlaying(!playing));
  refs.playhead.addEventListener('input', event => { setPlaying(false); setPlayhead(Number(event.target.value) / 100); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) setPlaying(false); });

  $('#addLayerBtn').addEventListener('click', () => { refs.addMenu.hidden = !refs.addMenu.hidden; });
  refs.pagePrev.addEventListener('click', () => { layerPage--; renderLayers(); });
  refs.pageNext.addEventListener('click', () => { layerPage++; renderLayers(); });
  refs.panel.addEventListener('click', event => {
    const target = event.target.closest('[data-deck-target]');
    if (!target) return;
    setDeck(target.dataset.deckTarget);
  });
  for (const button of document.querySelectorAll('[data-deck-target]')) button.setAttribute('aria-pressed', String(button.dataset.deckTarget === refs.panel.dataset.deck));
  refs.motion.addEventListener('click', event => {
    if (event.detail && performance.now() < ignoreMotionClickUntil) return;
    const source = event.target.closest('[data-mod-source]');
    if (source) { activeLfo = source.dataset.modSource; renderMotion(); return; }
    const target = event.target.closest('[data-mod-target]');
    if (target) {
      const existing = doc.routes.find(route => route.layerId === selectedId && route.target === target.dataset.modTarget);
      if (existing?.target === activeRoute) removeMotion(existing.target);
      else if (existing) { activeRoute = existing.target; activeLfo = existing.lfo; renderMotion(); }
      else connectMotion(activeLfo, target.dataset.modTarget);
      return;
    }
    const wave = event.target.closest('[data-wave]');
    if (wave) {
      doc.lfos.find(lfo => lfo.id === wave.dataset.lfo).wave = wave.dataset.wave;
      commit(); renderMotion(); renderPreview();
      return;
    }
    if (event.target.closest('[data-mod-remove]') && activeRoute) removeMotion(activeRoute);
  });
  refs.motion.addEventListener('input', event => {
    const param = event.target.dataset.param;
    if (!param) return;
    const value = Number(event.target.value);
    if (param === 'depth') {
      const route = doc.routes.find(item => item.layerId === selectedId && item.target === activeRoute);
      if (route) route.depth = value / 100;
    } else {
      const [key, id] = param.split('-');
      const lfo = doc.lfos.find(item => item.id === id);
      if (lfo && key === 'rate') lfo.rate = value / 100;
      if (lfo && key === 'phase') lfo.phase = value / 100;
    }
    const output = refs.motion.querySelector(`[data-output="${param}"]`);
    if (output) output.textContent = value;
    const body = event.target.closest('.knob-body');
    body?.style.setProperty('--turn', `${-135 + (value - Number(event.target.min)) / (Number(event.target.max) - Number(event.target.min)) * 270}deg`);
    renderPreview();
  });
  refs.motion.addEventListener('change', event => { if (event.target.dataset.param) commit(); });
  refs.motion.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const port = event.target.closest('[data-mod-source], [data-mod-target]');
    if (port) {
      motionDrag = { port, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
      port.setPointerCapture(event.pointerId);
      return;
    }
    const input = event.target.closest('.knob-body input');
    if (!input) return;
    if (event.pointerType === 'touch') {
      const now = performance.now();
      if (lastKnobTap?.param === input.dataset.param && now - lastKnobTap.time < 350) {
        event.preventDefault(); lastKnobTap = null;
        resetMotionKnob(input); return;
      }
      lastKnobTap = { param: input.dataset.param, time: now };
    }
    motionKnobDrag = { input, pointerId: event.pointerId, startY: event.clientY, startValue: Number(input.value) };
    input.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  refs.motion.addEventListener('pointermove', event => {
    if (motionDrag && event.pointerId === motionDrag.pointerId) {
      const bay = refs.motion.querySelector('.mod-patch-bay');
      const bounds = bay.getBoundingClientRect();
      motionDrag.moved ||= Math.hypot(event.clientX - motionDrag.startX, event.clientY - motionDrag.startY) > 6;
      motionDrag.point = { x: clamp(event.clientX - bounds.left, 0, bounds.width), y: clamp(event.clientY - bounds.top, 0, bounds.height) };
      if (motionDrag.moved) {
        const hover = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-mod-target]');
        for (const target of bay.querySelectorAll('[data-mod-target]')) target.classList.toggle('armed', target === hover);
        drawMotionBay();
      }
      return;
    }
    if (!motionKnobDrag || event.pointerId !== motionKnobDrag.pointerId) return;
    const { input, startY, startValue } = motionKnobDrag;
    const span = Number(input.max) - Number(input.min);
    const value = Math.round(clamp(startValue + (startY - event.clientY) * span / 180, Number(input.min), Number(input.max)));
    if (value !== Number(input.value)) { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  refs.motion.addEventListener('pointerup', event => {
    if (motionKnobDrag?.pointerId === event.pointerId) { motionKnobDrag = null; commit(); }
    if (!motionDrag || motionDrag.pointerId !== event.pointerId) return;
    const { port, moved } = motionDrag;
    motionDrag = null;
    if (!moved) return;
    ignoreMotionClickUntil = performance.now() + 120;
    const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-mod-target]');
    const target = hit?.closest('.mod-patch-bay') === port.closest('.mod-patch-bay') ? hit.dataset.modTarget : null;
    if (port.dataset.modSource && target) connectMotion(port.dataset.modSource, target);
    else if (port.dataset.modTarget && target && target !== port.dataset.modTarget) {
      const route = doc.routes.find(item => item.layerId === selectedId && item.target === port.dataset.modTarget);
      if (route) {
        doc.routes = doc.routes.filter(item => item.layerId !== selectedId || item.target !== target);
        route.target = target;
        activeRoute = target;
        activeLfo = route.lfo;
        commit(); renderMotion(); renderPreview();
      }
    } else if (port.dataset.modTarget && !target) removeMotion(port.dataset.modTarget);
    else renderMotion();
  });
  refs.motion.addEventListener('pointercancel', event => {
    if (motionDrag?.pointerId === event.pointerId) { motionDrag = null; renderMotion(); }
    if (motionKnobDrag?.pointerId === event.pointerId) { motionKnobDrag = null; commit(); }
  });
  refs.motion.addEventListener('dblclick', event => {
    const input = event.target.closest('.knob-body input');
    if (input) { event.preventDefault(); resetMotionKnob(input); }
  });
  refs.addMenu.addEventListener('click', event => { if (event.target.closest('[data-close-add]')) { refs.addMenu.hidden = true; return; } const button = event.target.closest('[data-add-type]'); if (button) addLayer(button.dataset.addType); });
  document.addEventListener('pointerdown', event => { if (!event.target.closest('.module-layers')) refs.addMenu.hidden = true; });
  refs.layerList.addEventListener('click', event => {
    const row = event.target.closest('[data-row-id]'); if (!row) return;
    const id = row.dataset.rowId, layer = doc.layers.find(item => item.id === id);
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return select(id);
    if (action === 'lock') layer.locked = !layer.locked;
    else if (action === 'visibility') layer.visible = !layer.visible;
    else {
      const index = doc.layers.indexOf(layer), next = action === 'up' ? index + 1 : index - 1;
      if (next >= 0 && next < doc.layers.length) [doc.layers[index], doc.layers[next]] = [doc.layers[next], doc.layers[index]];
    }
    commit(); renderAll();
  });
  refs.layerList.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.dataset.rowId) select(event.target.dataset.rowId); });
  refs.inspector.addEventListener('input', event => {
    if (event.target.matches('.color-lightness')) {
      const joystick = event.target.closest('.color-joystick');
      const { h, s } = hexToHsl(joystick.style.getPropertyValue('--color'));
      setJoystickColor(joystick, hslToHex(h, s, Number(event.target.value) / 100));
      return;
    }
    const layer = selectedLayer(), param = event.target.dataset.param;
    if (!layer || !param) return;
    if (['x', 'y', 'w', 'h', 'opacity', 'detail', 'dither', 'ditherSize', 'blur', 'warp', 'echo'].includes(param)) layer[param] = Number(event.target.value) / 100;
    else if (['rotation', 'count'].includes(param)) layer[param] = Number(event.target.value);
    else if (['color', 'color2', 'text'].includes(param)) layer[param] = event.target.value;
    else return;
    const output = refs.inspector.querySelector(`[data-output="${param}"]`);
    if (output) output.textContent = event.target.value + (param === 'rotation' ? '°' : ['x', 'y', 'w', 'h', 'opacity', 'detail'].includes(param) ? '%' : '');
    const body = event.target.closest('.knob-body');
    if (body) body.style.setProperty('--turn', `${-135 + (Number(event.target.value) - Number(event.target.min)) / (Number(event.target.max) - Number(event.target.min)) * 270}deg`);
    if (EFFECT_PORTS.some(effect => effect.id === param)) syncPatchBay();
    renderPreview();
  });
  refs.inspector.addEventListener('change', event => {
    if (event.target.matches('.color-lightness')) { commit(); return; }
    const layer = selectedLayer(), param = event.target.dataset.param;
    if (!layer || !param) return;
    commit(); renderAll();
  });
  refs.inspector.addEventListener('click', event => {
    const port = event.target.closest('[data-patch-port]');
    if (port) {
      if (event.detail && performance.now() < ignorePatchClickUntil) { event.preventDefault(); return; }
      if (selectedLayer() && togglePatch(selectedLayer(), port.dataset.patchPort)) { commit(); renderAll(); }
      return;
    }
    const ditherShape = event.target.closest('[data-dither-shape]')?.dataset.ditherShape;
    if (ditherShape && selectedLayer()) { selectedLayer().ditherShape = ditherShape; commit(); renderAll(); return; }
    const colorMode = event.target.closest('[data-color-mode]')?.dataset.colorMode;
    if (colorMode && selectedLayer()) { selectedLayer().colorMode = colorMode; commit(); renderAll(); return; }
    const type = event.target.closest('[data-type]')?.dataset.type;
    if (type === 'image') { openImages(selectedId); return; }
    if (type && selectedLayer()) { selectedLayer().type = type; commit(); renderAll(); return; }
    if (event.target.closest('[data-image-choose]')) { openImages(selectedId); return; }
    const imageOption = event.target.closest('[data-image-option]')?.dataset.imageOption;
    if (imageOption && selectedLayer()) { selectedLayer()[imageOption] = !selectedLayer()[imageOption]; commit(); renderAll(); return; }
    if (event.target.closest('[data-image-repeat]') && selectedLayer()) { selectedLayer().repeat = selectedLayer().repeat % 5 + 1; commit(); renderAll(); return; }
    const action = event.target.dataset.inspectorAction;
    if (action === 'duplicate') duplicateSelected();
    if (action === 'delete') removeSelected();
  });
  refs.inspector.addEventListener('pointerdown', event => {
    const port = event.target.closest('[data-patch-port]');
    if (port && event.button === 0) {
      patchDrag = { port, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
      port.setPointerCapture(event.pointerId);
      return;
    }
    const input = event.target.closest('.knob-body input');
    if (!input || event.button !== 0) return;
    if (event.pointerType === 'touch') {
      const now = performance.now();
      if (lastKnobTap?.param === input.dataset.param && now - lastKnobTap.time < 350) {
        event.preventDefault();
        lastKnobTap = null;
        resetKnob(input);
        return;
      }
      lastKnobTap = { param: input.dataset.param, time: now };
    }
    knobDrag = { input, pointerId: event.pointerId, startY: event.clientY, startValue: Number(input.value) };
    input.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  refs.inspector.addEventListener('pointermove', event => {
    if (patchDrag && event.pointerId === patchDrag.pointerId) {
      const bay = patchDrag.port.closest('.patch-bay');
      const bounds = bay.getBoundingClientRect();
      patchDrag.moved ||= Math.hypot(event.clientX - patchDrag.startX, event.clientY - patchDrag.startY) > 6;
      patchDrag.point = { x: clamp(event.clientX - bounds.left, 0, bounds.width), y: clamp(event.clientY - bounds.top, 0, bounds.height) };
      if (patchDrag.moved) {
        const hover = document.elementFromPoint(event.clientX, event.clientY)?.closest('.patch-target');
        for (const target of bay.querySelectorAll('.patch-target')) target.classList.toggle('armed', target === hover);
        drawPatchBay();
      }
      return;
    }
    if (!knobDrag || event.pointerId !== knobDrag.pointerId) return;
    const { input, startY, startValue } = knobDrag;
    const span = Number(input.max) - Number(input.min);
    const value = Math.round(clamp(startValue + (startY - event.clientY) * span / 180, Number(input.min), Number(input.max)));
    if (value !== Number(input.value)) { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  const finishKnob = event => {
    if (!knobDrag || event.pointerId !== knobDrag.pointerId) return;
    knobDrag = null;
    commit();
  };
  refs.inspector.addEventListener('pointerup', finishKnob);
  refs.inspector.addEventListener('pointercancel', finishKnob);
  refs.inspector.addEventListener('pointerup', event => {
    if (!patchDrag || event.pointerId !== patchDrag.pointerId) return;
    const { port, moved } = patchDrag;
    patchDrag = null;
    if (!moved) return;
    ignorePatchClickUntil = performance.now() + 100;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-patch-port]');
    const destination = target?.closest('.patch-bay') === port.closest('.patch-bay') ? target.dataset.patchPort : null;
    const changed = routePatch(selectedLayer(), port.dataset.patchPort, destination === 'source' ? null : destination);
    if (changed) { commit(); renderAll(); }
    else {
      for (const target of port.closest('.patch-bay').querySelectorAll('.patch-target')) target.classList.remove('armed');
      drawPatchBay();
    }
  });
  refs.inspector.addEventListener('pointercancel', event => {
    if (patchDrag && event.pointerId === patchDrag.pointerId) { patchDrag = null; drawPatchBay(); }
  });
  window.addEventListener('resize', () => { drawPatchBay(); drawMotionBay(); });
  refs.inspector.addEventListener('dblclick', event => {
    const input = event.target.closest('.knob-body input');
    if (input) { event.preventDefault(); resetKnob(input); }
  });
  refs.ratio.addEventListener('click', event => { const value = event.target.closest('[data-ratio]')?.dataset.ratio; if (value) { doc.ratio = value; commit(); renderAll(); } });
  refs.background.addEventListener('input', event => {
    if (!event.target.matches('.color-lightness')) return;
    const joystick = event.target.closest('.color-joystick');
    const { h, s } = hexToHsl(joystick.style.getPropertyValue('--color'));
    setJoystickColor(joystick, hslToHex(h, s, Number(event.target.value) / 100));
  });
  refs.background.addEventListener('change', event => { if (event.target.matches('.color-lightness')) commit(); });
  for (const root of [refs.background, refs.inspector]) {
    root.addEventListener('pointerdown', event => {
      const disc = event.target.closest('.color-disc');
      if (!disc || event.button !== 0) return;
      colorDrag = { disc, pointerId: event.pointerId };
      disc.setPointerCapture(event.pointerId);
      moveColorDisc(event, disc.closest('.color-joystick'));
      event.preventDefault();
    });
    root.addEventListener('pointermove', event => {
      if (colorDrag && event.pointerId === colorDrag.pointerId) moveColorDisc(event, colorDrag.disc.closest('.color-joystick'));
    });
    const finishColor = event => {
      if (!colorDrag || event.pointerId !== colorDrag.pointerId) return;
      colorDrag = null;
      commit();
    };
    root.addEventListener('pointerup', finishColor);
    root.addEventListener('pointercancel', finishColor);
    root.addEventListener('keydown', event => {
      const disc = event.target.closest('.color-disc');
      if (!disc) return;
      const joystick = disc.closest('.color-joystick');
      const { h, s, l } = hexToHsl(joystick.style.getPropertyValue('--color'));
      let hue = h, saturation = s;
      if (event.key === 'ArrowLeft') hue = (h + 355) % 360;
      else if (event.key === 'ArrowRight') hue = (h + 5) % 360;
      else if (event.key === 'ArrowUp') saturation = clamp(s + .05, 0, 1);
      else if (event.key === 'ArrowDown') saturation = clamp(s - .05, 0, 1);
      else if (event.key === 'Home') saturation = 0;
      else return;
      event.preventDefault();
      setJoystickColor(joystick, hslToHex(hue, saturation, l));
      commit();
    });
  }
  refs.surround.addEventListener('pointerdown', startDrag);
  refs.surround.addEventListener('pointermove', moveDrag);
  refs.surround.addEventListener('pointerup', finishDrag);
  refs.surround.addEventListener('pointercancel', finishDrag);
  $('#mutateBtn').addEventListener('click', () => {
    const layer = selectedLayer(); if (!layer || layer.locked) return;
    Object.assign(layer, varyLayer(layer));
    for (const route of doc.routes.filter(item => item.layerId === layer.id)) route.depth = Math.round((.2 + Math.random() * .65) * 100) / 100 * (Math.random() < .25 ? -1 : 1);
    commit(); renderAll();
  });
  $('#evolveBtn').addEventListener('click', () => { doc = mutateFlag(doc); commit(); setPlayhead(0); renderAll(); setPlaying(false); });
  $('#randomBtn').addEventListener('click', () => { doc = randomDocument(); selectedId = doc.layers.at(-1)?.id ?? null; activeRoute = null; commit(); setPlayhead(0); renderAll(); setPlaying(false); });
  refs.undo.addEventListener('click', () => restore(historyIndex - 1));
  refs.redo.addEventListener('click', () => restore(historyIndex + 1));
  $('#shareBtn').addEventListener('click', share);
  $('#exportBtn').addEventListener('click', () => refs.dialog.showModal());
  $('#closeDialog').addEventListener('click', () => refs.dialog.close());
  $('#downloadSvg').addEventListener('click', exportSvg);
  $('#downloadPng').addEventListener('click', exportPng);
  $('#downloadWebm').addEventListener('click', exportWebm);
  document.addEventListener('keydown', event => {
    const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); restore(historyIndex + (event.shiftKey ? 1 : -1)); }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); restore(historyIndex + 1); }
    else if (!editing && (event.key === 'Delete' || event.key === 'Backspace')) removeSelected();
    else if (!editing && event.key.toLowerCase() === 'd' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); duplicateSelected(); }
  });
  window.addEventListener('hashchange', () => {
    const value = new URLSearchParams(location.hash.slice(1)).get('d');
    const fromLink = decodeDocument(value);
    if (fromLink) { doc = fromLink; selectedId = doc.layers.at(-1)?.id ?? null; activeRoute = null; history = [JSON.stringify(doc)]; historyIndex = 0; setPlayhead(0); renderAll(); setPlaying(false); }
  });
}

init();
