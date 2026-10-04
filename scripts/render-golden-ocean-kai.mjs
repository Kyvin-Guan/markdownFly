/**
 * Render rag-deep-dive.md with: golden layout × ocean color × kai text.
 * build first: pnpm build  →  then: node scripts/render-golden-ocean-kai.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseMarkdown,
  createThemeFromScheme,
  getColorScheme,
  renderPresentation,
} from '../dist/index.js';

const input = resolve('rag-deep-dive.md');
const output = resolve('rag-deep-dive-golden-ocean-kai.pptx');

const scheme = getColorScheme('ocean');
if (!scheme) {
  console.error('scheme "ocean" not found');
  process.exit(1);
}

// golden (layout) × kai (text) combined onto the ocean color scheme
const theme = createThemeFromScheme(scheme, {
  textScheme: 'kai',
  layoutScheme: 'golden',
});

console.log('color :', scheme.name, ' background:', theme.colors.background, ' text:', theme.colors.text);
console.log('text  :', theme.textSet, ' bodyFace:', theme.fonts.body, ' headingFace:', theme.fonts.heading);
console.log('layout:', theme.layoutSet);

const md = readFileSync(input, 'utf-8');
const presentation = parseMarkdown(md);
presentation.config.theme = scheme.name;

await renderPresentation(presentation, theme, output, input);
console.log('wrote', output);
