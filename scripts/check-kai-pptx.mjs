import JSZip from 'jszip';
import { readFileSync } from 'node:fs';

const zip = await JSZip.loadAsync(readFileSync('ppt-kai-test.pptx'));
let kai = 0;
let slides = 0;
const sample = [];
for (const name of Object.keys(zip.files)) {
  if (!/^ppt\/slides\/slide\d+\.xml$/.test(name)) continue;
  slides += 1;
  const xml = await zip.files[name].async('string');
  kai += (xml.match(/typeface="KaiTi"/g) || []).length;
  for (const m of xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)) {
    const t = m[1];
    if (/Transformer|RAG|检索|基于/.test(t) && sample.length < 6) {
      sample.push(t.slice(0, 48));
    }
  }
}
console.log({ slides, kaiTypefaceHits: kai, sampleTexts: sample });
