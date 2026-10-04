/**
 * Render rag-deep-dive.md with a ColorScheme (default: ocean).
 * Usage: node scripts/render-ocean-demo.mjs [scheme-name]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseMarkdown,
  createThemeFromScheme,
  getColorScheme,
  renderPresentation,
} from '../dist/index.js';

const schemeName = process.argv[2] ?? 'ocean';
const input = resolve('rag-deep-dive.md');
const output = resolve(`rag-deep-dive-${schemeName}.pptx`);

const scheme = getColorScheme(schemeName);
if (!scheme) {
  console.error(`scheme "${schemeName}" not found`);
  process.exit(1);
}

const theme = createThemeFromScheme(scheme);

console.log('scheme:', scheme.name, scheme.mode ?? '(inferred)');
console.log('background:', theme.colors.background, ' text:', theme.colors.text);
console.log('primary:', theme.colors.primary, ' codeBackground:', theme.colors.codeBackground);
console.log('shikiTheme:', theme.shikiTheme);

const md = readFileSync(input, 'utf-8');
const presentation = parseMarkdown(md);
presentation.config.theme = scheme.name;

await renderPresentation(presentation, theme, output, input);
console.log('wrote', output);
