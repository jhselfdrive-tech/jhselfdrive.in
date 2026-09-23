// Same mark as generate-icons.mjs; Xcode's single-size icon must be opaque.
import { mkdir, writeFile } from 'node:fs/promises';
import { ImageResponse } from 'next/og.js';
import sharp from 'sharp';
import { createElement as h } from 'react';
const directory = 'ios/JHOps/Resources/Assets.xcassets/AppIcon.appiconset';
await mkdir(directory, { recursive: true });
const response = new ImageResponse(h('div', { style: {
  width: '100%', height: '100%', display: 'flex', alignItems: 'center',
  justifyContent: 'center', background: '#ed684d', color: '#fffefa',
  fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 430,
}}, 'JH'), { width: 1024, height: 1024 });
await sharp(Buffer.from(await response.arrayBuffer())).flatten({ background: '#ed684d' })
  .toColourspace('srgb').removeAlpha().png().toFile(`${directory}/icon-1024.png`);
await writeFile(`${directory}/Contents.json`, JSON.stringify({ images: [
  { filename: 'icon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' },
], info: { author: 'xcode', version: 1 } }, null, 2) + '\n');
if ((await sharp(`${directory}/icon-1024.png`).metadata()).hasAlpha) throw new Error('Icon has alpha');
console.log('Opaque 1024px app icon generated.');
