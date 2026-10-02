import test from 'node:test';
import assert from 'node:assert/strict';
import { makeLayer, decodeDocument, encodeDocument } from '../src/model.js';
import { togglePatch, routePatch } from '../src/patch.js';

test('effect jacks connect, reroute, unplug, and survive a shared link', () => {
  const layer = makeLayer('circle');
  assert.equal(routePatch(layer, 'source', 'dither'), true);
  assert.equal(layer.dither, .55);
  assert.equal(routePatch(layer, 'dither', 'blur'), true);
  assert.equal(layer.dither, 0);
  assert.equal(layer.blur, .28);
  assert.equal(togglePatch(layer, 'echo'), true);
  assert.equal(layer.echo, .45);
  assert.equal(routePatch(layer, 'blur', null), true);
  assert.equal(layer.blur, 0);
  assert.equal(decodeDocument(encodeDocument({ version: 1, ratio: '3:2', background: '#ffffff', layers: [layer] })).layers[0].echo, .45);
});

test('invalid routes and empty outputs leave a layer unchanged', () => {
  const layer = makeLayer('star');
  assert.equal(routePatch(layer, 'source', 'unknown'), false);
  assert.equal(routePatch(layer, 'dither', 'warp'), false);
  assert.equal(togglePatch(layer, 'unknown'), false);
  assert.equal(layer.warp, 0);
});
