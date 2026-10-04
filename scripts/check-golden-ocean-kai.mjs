import { readFileSync, statSync } from 'node:fs';
import JSZip from 'jszip';

const file = 'rag-deep-dive-golden-ocean-kai.pptx';
const st = statSync(file);
console.log('file:', file, ' size:', (st.size / 1024).toFixed(1) + 'KB');

const buf = readFileSync(file);
const zip = await JSZip.loadAsync(buf);

const slides = Object.keys(zip.files)
  .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
  .sort();
console.log('slides:', slides.length);

// KaiTi typeface hits + golden golden-ratio rule color (ocean primary 4F9FD9)
let kai = 0;
const primaryHex = '4F9FD9';
let primaryFill = 0;
let ruleShapes = 0;
const samples = [];
for (const name of slides) {
  const xml = await zip.files[name].async('string');
  kai += (xml.match(/typeface="KaiTi"/g) || []).length;
  primaryFill += (xml.match(new RegExp('srgbClr val="' + primaryHex + '"', 'g')) || []).length;
  // count rect shapes (used for golden rules)
  ruleShapes += (xml.match(/<p:sp>/g) || []).length;
  for (const m of xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)) {
    const t = m[1];
    if (/RAG|检索|黄金|幻觉/.test(t) && samples.length < 8) samples.push(t.slice(0, 40));
  }
}
console.log('KaiTi typeface hits:', kai);
console.log('ocean primary(4F9FD9) color refs:', primaryFill);
console.log('shape count (rules/bars):', ruleShapes);
console.log('samples:', samples);
