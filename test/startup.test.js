import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

test('HTML contains every static element used by application startup', () => {
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
  for (const match of app.matchAll(/\$\('#([^']+)'\)/g)) {
    assert.ok(ids.has(match[1]), `Missing element #${match[1]}`);
  }
});

test('script and stylesheet URLs have the same deployment version', () => {
  const script = html.match(/src="\.\/src\/app\.js\?v=([a-f0-9]{12})"/);
  const style = html.match(/href="\.\/style\.css\?v=([a-f0-9]{12})"/);
  assert.ok(script, 'Entry script must have a cache version');
  assert.ok(style, 'Stylesheet must have a cache version');
  assert.equal(script[1], style[1]);
  for (const match of app.matchAll(/from ['"]\.\/[^'"]+\.js(?:\?v=([a-f0-9]{12}))?['"]/g)) {
    assert.equal(match[1], script[1], 'Imported modules must use the deployment version');
  }
});
