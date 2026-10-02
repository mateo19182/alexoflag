import test from 'node:test';
import assert from 'node:assert/strict';
import { hexToHsl, hslToHex } from '../src/color.js';

test('color joystick conversion preserves existing flag colors', () => {
  for (const hex of ['#000000', '#ffffff', '#e7e7e1', '#303030', '#858585', '#e46749', '#253b43']) {
    const { h, s, l } = hexToHsl(hex);
    assert.equal(hslToHex(h, s, l), hex);
  }
});

test('center of the color disc yields grayscale at the chosen lightness', () => {
  assert.equal(hslToHex(240, 0, .5), '#808080');
  assert.equal(hslToHex(120, 1, .5), '#00ff00');
});
