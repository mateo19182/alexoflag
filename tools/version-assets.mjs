import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const paths = ['index.html', 'style.css', ...readdirSync('src').filter(name => name.endsWith('.js')).sort().map(name => `src/${name}`)];
const unversion = text => text.replace(/\?v=[a-f0-9]{12}/g, '');
const sources = paths.map(path => [path, unversion(readFileSync(path, 'utf8'))]);
const hash = createHash('sha256');
for (const [path, source] of sources) hash.update(path).update(source);
const version = hash.digest('hex').slice(0, 12);
for (const [path, source] of sources) {
  const output = path === 'index.html'
    ? source.replace(/(\.\/style\.css|\.\/src\/app\.js)(?=")/g, `$1?v=${version}`)
    : path.endsWith('.js')
      ? source.replace(/(\.\/[^'"`\n]+\.js)(?=['"`])/g, `$1?v=${version}`)
      : source;
  writeFileSync(path, output);
}
console.log(`Asset version: ${version}`);
