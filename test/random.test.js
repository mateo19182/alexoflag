import test from 'node:test';
import assert from 'node:assert/strict';
import { makeLayer, varyLayer, normalizeDocument, encodeDocument, decodeDocument } from '../src/model.js';
import { defaultLfos } from '../src/modulation.js';
import { composeRandomFlag, mutateFlag } from '../src/random.js';
import { SYMBOL_LIBRARY } from '../src/emblems.js';

// Repeatable sample exercises composition and frequency without flaky odds.
function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test('random compositions preserve artwork proportions, IDs and sharing', () => {
  const rng = seeded(19182);
  let imageFlags = 0;
  const emblems = new Set();
  const fields = new Set();
  let effects = 0;
  for (let i = 0; i < 600; i++) {
    const doc = composeRandomFlag(makeLayer, defaultLfos, rng);
    assert.deepEqual(normalizeDocument(doc), doc);
    assert.deepEqual(decodeDocument(encodeDocument(doc)), doc);
    assert.equal(new Set(doc.layers.map(layer => layer.id)).size, doc.layers.length);
    assert.ok(doc.layers.length >= 2 && doc.layers.length <= 6);
    const [a, b] = doc.ratio.split(':').map(Number);
    const images = doc.layers.filter(layer => layer.type === 'image');
    imageFlags += images.length > 0;
    fields.add(doc.layers[0].type);
    for (const layer of images) {
      const charge = SYMBOL_LIBRARY.find(item => item.id === layer.emblem);
      assert.ok(charge, 'only standalone symbols are generated');
      assert.equal(layer.imageTint, true);
      emblems.add(layer.emblem);
      assert.ok(Math.abs(layer.w / layer.h * a / b - charge.ratio) < 1e-9);
      assert.ok(layer.opacity === 1);
      assert.equal(layer.rotation, 0);
      assert.ok(doc.routes.every(route => route.layerId !== layer.id || route.target !== 'rotation'));
    }
    const treated = doc.layers.filter(layer => layer.dither || layer.blur || layer.warp || layer.echo);
    assert.ok(treated.length <= 1);
    effects += treated.length;
    assert.ok(doc.routes.every(route => doc.layers.some(layer => layer.id === route.layerId)));
  }
  assert.ok(imageFlags > 420 && imageFlags < 520, `${imageFlags}/600 image flags`);
  assert.equal(emblems.size, SYMBOL_LIBRARY.length);
  assert.ok(fields.size >= 7);
  assert.ok(effects > 150 && effects < 350);
});

 test('per-layer random keeps images upright', () => {
  for (let i = 0; i < 30; i++) {
    assert.equal(varyLayer(makeLayer('image', { rotation: 45 })).rotation, 0);
  }
});

test('mutation preserves locked layers, uploads, identity and routing', () => {
  const rng = seeded(27);
  const doc = composeRandomFlag(makeLayer, defaultLfos, rng);
  doc.layers[0].locked = true;
  doc.layers.push(makeLayer('image', { imageSource: 'data:image/png;base64,YQ==', w: .3, h: .6, rotation: 45 }));
  doc.layers.push(makeLayer('star', { visible: false }));
  const original = structuredClone(doc);
  const changed = mutateFlag(doc, rng);
  assert.deepEqual(doc, original);
  assert.deepEqual(changed.layers[0], doc.layers[0]);
  assert.deepEqual(changed.layers.at(-1), doc.layers.at(-1));
  assert.deepEqual(changed.routes, doc.routes);
  assert.deepEqual(changed.lfos, doc.lfos);
  assert.equal(changed.background, doc.background);
  assert.equal(changed.ratio, doc.ratio);
  assert.deepEqual(changed.layers.map(l => l.id), doc.layers.map(l => l.id));
  assert.equal(changed.layers.at(-2).imageSource, doc.layers.at(-2).imageSource);
  assert.equal(changed.layers.at(-2).rotation, 0);
  assert.ok(Math.abs(changed.layers.at(-2).w / changed.layers.at(-2).h - .5) < 1e-9);
  assert.notDeepEqual(changed.layers[1], doc.layers[1]);
  assert.deepEqual(normalizeDocument(changed), changed);
  assert.deepEqual(decodeDocument(encodeDocument(changed)).layers[0], doc.layers[0]);
  doc.layers.forEach(layer => { layer.locked = true; });
  assert.deepEqual(mutateFlag(doc, rng), doc);
});

test('per-layer random also uses only standalone symbols', () => {
  for (let i = 0; i < 200; i++) {
    const layer = varyLayer(makeLayer('image', { emblem: 'spain' }));
    assert.ok(SYMBOL_LIBRARY.some(symbol => symbol.id === layer.emblem));
  }
});
