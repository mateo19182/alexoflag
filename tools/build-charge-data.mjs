// Rebuild self-contained export modules from the bundled PNG artwork.
// Run from the project root after extracting and rasterizing source SVGs.
import { FLAG_CHARGES } from '../src/flag-charges.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
await mkdir(new URL('../src/charge-data/', import.meta.url), { recursive: true });
for (const charge of FLAG_CHARGES) {
  const png = await readFile(new URL(`../assets/charges/${charge.code}.png`, import.meta.url));
  const source = `data:image/png;base64,${png.toString('base64')}`;
  await writeFile(new URL(`../src/charge-data/${charge.id}.js`, import.meta.url), `export default ${JSON.stringify(source)};\n`);
}
