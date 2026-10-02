import test from 'node:test';
import assert from 'node:assert/strict';
import { TYPES, DITHER_SHAPES, COLOR_MODES, initialDocument, makeLayer, normalizeDocument, randomDocument, varyLayer, encodeDocument, decodeDocument } from '../src/model.js';
import { dimensions, svgMarkup } from '../src/render.js';

test('every layer type produces SVG', () => {
  for (const type of TYPES) {
    const doc = initialDocument();
    doc.layers = [makeLayer(type.id)];
    const svg = svgMarkup(doc);
    assert.match(svg, new RegExp(`data-layer-id="${doc.layers[0].id}"`));
    assert.ok(svg.length > 270);
  }
});

test('share link data restores a complete edited document', () => {
  const doc = initialDocument();
  doc.ratio = '5:3';
  doc.layers.push(makeLayer('text', { text: 'Señal & memoria', rotation: 32 }));
  const restored = decodeDocument(encodeDocument(doc));
  assert.deepEqual(restored, doc);
});

test('imported documents are constrained and text is escaped', () => {
  const doc = normalizeDocument({ version: 1, ratio: 'bad', background: 'red', layers: [{ type: 'text', id: 'x', x: 999, text: '<script>alert(1)</script>' }] });
  assert.equal(doc.ratio, '3:2');
  assert.equal(doc.background, '#e9e6da');
  assert.equal(doc.layers[0].x, 3);
  assert.doesNotMatch(svgMarkup(doc), /<script>/);
  assert.match(svgMarkup(doc), /&lt;script&gt;/);
});

test('all configured ratios produce expected viewBox heights', () => {
  assert.equal(dimensions('3:2').height, 600);
  assert.equal(dimensions('1:1').height, 900);
  assert.equal(dimensions('2:1').height, 450);
});

test('random designs stay within the document format', () => {
  for (let i = 0; i < 20; i++) assert.ok(normalizeDocument(randomDocument()));
});

test('layer effects survive links and leave older flags intact', () => {
  const old = { version: 1, ratio: '3:2', background: '#e9e6da', layers: [{ type: 'star', id: 'old' }] };
  const normalized = normalizeDocument(old);
  assert.equal(normalized.layers[0].blur, 0);
  assert.doesNotMatch(svgMarkup(normalized), /feGaussianBlur/);

  const doc = initialDocument();
  Object.assign(doc.layers[0], { dither: .6, ditherSize: .3, ditherShape: 'diamond', colorMode: 'bw', blur: .4, warp: .3, echo: .5 });
  const restored = decodeDocument(encodeDocument(doc));
  assert.deepEqual(restored.layers[0], doc.layers[0]);
  const svg = svgMarkup(restored);
  for (const primitive of ['pattern-', 'mask-', '<polygon', 'feComponentTransfer', 'feGaussianBlur', 'feDisplacementMap', 'feOffset']) {
    assert.ok(svg.includes(primitive), `${primitive} missing`);
  }
  for (const ditherShape of DITHER_SHAPES) {
    doc.layers[0].ditherShape = ditherShape;
    assert.match(svgMarkup(doc), /mask="url\(#mask-/);
  }
  for (const colorMode of COLOR_MODES) {
    doc.layers[0].colorMode = colorMode;
    assert.equal(normalizeDocument(doc).layers[0].colorMode, colorMode);
  }
});

test('variation changes effect controls', () => {
  const varied = varyLayer(makeLayer('circle'));
  assert.ok(varied.dither || varied.blur || varied.warp || varied.echo);
  assert.ok(DITHER_SHAPES.includes(varied.ditherShape));
  assert.ok(COLOR_MODES.includes(varied.colorMode));
});
