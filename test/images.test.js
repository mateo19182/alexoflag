import test from 'node:test';
import assert from 'node:assert/strict';
import { initialDocument, makeLayer, encodeDocument, decodeDocument, normalizeDocument } from '../src/model.js';
import { svgMarkup } from '../src/render.js';
import { EMBLEMS } from '../src/emblems.js';

test('heraldic charges and image transforms survive sharing and render as vectors', () => {
  for (const emblem of EMBLEMS) {
    const doc = initialDocument();
    doc.layers = [makeLayer('image', { emblem: emblem.id, mirror: true, repeat: 3, blur: .2 })];
    const restored = decodeDocument(encodeDocument(doc));
    assert.equal(restored.layers[0].emblem, emblem.id);
    assert.equal(restored.layers[0].repeat, 3);
    const svg = svgMarkup(restored);
    assert.ok(svg.includes(emblem.path));
    assert.equal(svg.split(emblem.path).length - 1, 9);
    assert.ok(svg.includes('scale(-'));
  }
});

test('uploads embed raster data, escape names, and reject external or active image sources', () => {
  const doc = initialDocument();
  const source = 'data:image/png;base64,iVBORw0KGgo=';
  doc.layers = [makeLayer('image', { imageSource: source, imageTint: true, imageName: '<script>' })];
  const restored = decodeDocument(encodeDocument(doc));
  assert.equal(restored.layers[0].imageSource, source);
  assert.ok(svgMarkup(restored).includes('feFlood'));
  assert.ok(svgMarkup(restored).includes(source));
  for (const imageSource of ['https://example.com/image.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'javascript:alert(1)']) {
    doc.layers[0].imageSource = imageSource;
    assert.equal(normalizeDocument(doc).layers[0].imageSource, '');
    assert.ok(!svgMarkup(doc).includes(imageSource));
  }
});

test('real flag emblems retain original artwork in exports and compact shared links', async () => {
  const { FLAG_CHARGES, loadCharge } = await import('../src/emblems.js');
  for (const charge of FLAG_CHARGES) {
    await loadCharge(charge.id);
    const doc = initialDocument();
    doc.layers = [makeLayer('image', { emblem: charge.id, imageTint: true })];
    const encoded = encodeDocument(doc);
    assert.ok(encoded.length < 2500, 'built-in artwork is referenced by id in links');
    const restored = decodeDocument(encoded);
    assert.equal(restored.layers[0].emblem, charge.id);
    const svg = svgMarkup(restored);
    assert.ok(svg.includes(charge.source), 'export embeds authentic image');
    assert.ok(svg.includes('feFlood'), 'preset image can be tinted');
    assert.ok(charge.country && charge.ratio > 0);
  }
});

test('symbol library excludes country crests while old documents still resolve', async () => {
  const { SYMBOL_LIBRARY, emblemById } = await import('../src/emblems.js');
  assert.equal(SYMBOL_LIBRARY.length, 40);
  assert.ok(SYMBOL_LIBRARY.every(item => item.category !== 'Arms' && item.ratio > 0));
  for (const id of ['spain', 'portugal', 'mexico', 'brazil', 'cyprus', 'iran', 'bolivia']) {
    assert.ok(!SYMBOL_LIBRARY.some(item => item.id === id));
    const doc = initialDocument();
    doc.layers = [makeLayer('image', { emblem: id })];
    assert.equal(decodeDocument(encodeDocument(doc)).layers[0].emblem, id);
    assert.equal(emblemById(id).id, id);
  }
});
