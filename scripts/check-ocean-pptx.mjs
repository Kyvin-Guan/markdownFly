import { readFileSync } from 'node:fs';
import JSZip from 'jszip';

const file = process.argv[2] ?? 'rag-deep-dive-ocean-dark.pptx';
const buf = readFileSync(file);
const zip = await JSZip.loadAsync(buf);
const slides = Object.keys(zip.files).filter((n) => n.startsWith('ppt/slides/slide'));
console.log(file, 'slides:', slides.length);

for (const name of slides.sort()) {
  const x = await zip.file(name).async('string');
  if (x.includes('Consolas')) {
    const f = [...x.matchAll(/srgbClr val="([0-9A-F]{6})"/g)].map((m) => m[1]);
    console.log(name, [...new Set(f)].join(' '));
  }
}

const x2 = await zip.file('ppt/slides/slide2.xml').async('string');
console.log('slide2', [...new Set([...x2.matchAll(/srgbClr val="([0-9A-F]{6})"/g)].map((m) => m[1]))].join(' '));
const x5 = await zip.file('ppt/slides/slide5.xml').async('string');
console.log('slide5', [...new Set([...x5.matchAll(/srgbClr val="([0-9A-F]{6})"/g)].map((m) => m[1]))].join(' '));
