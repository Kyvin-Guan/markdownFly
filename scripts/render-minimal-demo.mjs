/**
 * Render rag-deep-dive.md with: minimal layout × ocean color.
 * build first: pnpm build  →  then: node scripts/render-minimal-demo.mjs
 *
 * minimal：极简档案版式集，含超大章节序号（01 自动递增）。
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
const output = resolve('rag-deep-dive-minimal-ocean.pptx');

const scheme = getColorScheme('ocean');
if (!scheme) {
  console.error('scheme "ocean" not found');
  process.exit(1);
}

// minimal (layout) onto the ocean color scheme
const theme = createThemeFromScheme(scheme, {
  layoutScheme: 'minimal',
});

console.log('color :', scheme.name, ' background:', theme.colors.background, ' text:', theme.colors.text);
console.log('layout:', theme.layoutSet);

const md = readFileSync(input, 'utf-8');
const presentation = parseMarkdown(md);
presentation.config.theme = scheme.name;

await renderPresentation(presentation, theme, output, input);
console.log('wrote', output);
