import test from 'node:test';
import assert from 'node:assert/strict';
import { initialDocument, normalizeDocument, encodeDocument, decodeDocument } from '../src/model.js';
import { frameDocument, waveValue } from '../src/modulation.js';

test('LFOs animate a view without changing the saved flag', () => {
  const doc = initialDocument();
  const layer = doc.layers[0];
  doc.routes.push({ lfo: 'a', layerId: layer.id, target: 'x', depth: .5 });
  const before = JSON.stringify(doc);
  const quarter = frameDocument(doc, 1 / (doc.lfos[0].rate * 4));
  assert.ok(quarter.layers[0].x > layer.x);
  assert.equal(JSON.stringify(doc), before);
  assert.equal(frameDocument(doc, 0).layers[0].x, layer.x);
  assert.deepEqual(decodeDocument(encodeDocument(doc)).routes, doc.routes);
});

test('stepped random stays fixed within each cycle and links restore the same signal', () => {
  const doc = initialDocument();
  doc.lfos[0].wave = 'step';
  doc.lfos[0].rate = 1;
  const restored = decodeDocument(encodeDocument(doc));
  assert.equal(waveValue(doc.lfos[0], .1), waveValue(doc.lfos[0], .9));
  assert.equal(waveValue(doc.lfos[0], 1.2), waveValue(restored.lfos[0], 1.2));
});

test('modulation reaches colors and effects while clamping effect strength', () => {
  const doc = initialDocument();
  const layer = doc.layers[0];
  layer.color = '#d06050';
  doc.lfos[0].rate = 1;
  doc.routes.push({ lfo: 'a', layerId: layer.id, target: 'color', depth: .5 });
  doc.routes.push({ lfo: 'b', layerId: layer.id, target: 'blur', depth: 1 });
  doc.lfos[1].wave = 'square';
  doc.lfos[1].phase = 0;
  const frame = frameDocument(doc, .25).layers[0];
  assert.notEqual(frame.color, layer.color);
  assert.ok(frame.blur > 0);
  assert.equal(layer.blur, 0);
  assert.ok(frameDocument(doc, .75).layers[0].blur >= 0);
});

test('old flags migrate and malformed modulation routes are removed', () => {
  const doc = normalizeDocument({ version: 1, ratio: '3:2', background: '#ffffff', layers: [{ id: 'old', type: 'star' }] });
  assert.equal(doc.version, 2);
  assert.equal(doc.lfos.length, 2);
  assert.deepEqual(doc.routes, []);
  doc.routes = [
    { lfo: 'a', layerId: 'old', target: 'blur', depth: 9 },
    { lfo: 'b', layerId: 'missing', target: 'x', depth: .2 },
    { lfo: 'b', layerId: 'old', target: 'blur', depth: .2 }
  ];
  const restored = normalizeDocument(doc);
  assert.deepEqual(restored.routes, [{ lfo: 'a', layerId: 'old', target: 'blur', depth: 1 }]);
});
