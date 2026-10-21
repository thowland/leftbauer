#!/usr/bin/env node
/**
 * Generate the PWA icon set from `public/icon.svg`, into `public/`:
 *
 *   - apple-touch-icon.png   180×180, the iOS home screen
 *   - icon-192.png           192×192, the manifest
 *   - icon-512.png           512×512, the manifest and splash
 *   - icon-512-maskable.png  512×512, the manifest's maskable icon
 *   - favicon.png            32×32, browsers without SVG favicons
 *
 * iOS fills transparency with black and rounds the corners itself, so the
 * Apple and maskable icons are drawn full-bleed on the felt.
 *
 * Run `npm run icons` after editing `public/icon.svg`.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = (name) => resolve(root, 'public', name);
const svg = readFileSync(out('icon.svg'), 'utf8');

/**
 * The artwork as a square of felt. The trim follows the corner iOS cuts
 * (about 22% of the width); the maskable icon drops it, as Android's crop
 * would cut through it, and shrinks the jack into the safe zone instead.
 */
const fullBleed = Buffer.from(svg.replace('rx="96"', 'rx="0"').replace('rx="80"', 'rx="94"'));
const maskable = Buffer.from(
  svg
    .replace('rx="96"', 'rx="0"')
    .replace('<rect id="trim"', '<rect id="trim" display="none"')
    .replace('<g id="art">', '<g id="art" transform="translate(51.2 51.2) scale(0.8)">')
);

const render = (source, size) =>
  sharp(source, { density: 384 }).resize(size, size).png({ compressionLevel: 9 });

await Promise.all([
  render(Buffer.from(svg), 192).toFile(out('icon-192.png')),
  render(Buffer.from(svg), 512).toFile(out('icon-512.png')),
  render(Buffer.from(svg), 32).toFile(out('favicon.png')),
  render(fullBleed, 180).toFile(out('apple-touch-icon.png')),
  render(maskable, 512).toFile(out('icon-512-maskable.png')),
]);

console.log('Generated the icon set in public/.');
