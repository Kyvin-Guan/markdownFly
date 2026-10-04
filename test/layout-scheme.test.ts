import { describe, it, expect } from 'vitest';
import { DEFAULT_LAYOUT_SCHEME_NAME } from '../src/models/layout-scheme.js';
import { getTheme } from '../src/themes/index.js';
import {
  getLayoutScheme,
  listLayoutSchemes,
  folioLayoutScheme,
  legacyLayoutScheme,
} from '../src/themes/layout-schemes/index.js';

describe('LayoutScheme mechanism', () => {
  it('registers folio, legacy, and golden as built-in schemes', () => {
    expect(DEFAULT_LAYOUT_SCHEME_NAME).toBe('folio');
    expect(getLayoutScheme('folio')).toBeDefined();
    expect(getLayoutScheme('legacy')).toBeDefined();
    expect(getLayoutScheme('golden')).toBeDefined();
    expect(getLayoutScheme('minimal')).toBeDefined();
    expect(listLayoutSchemes().map((s) => s.name).sort()).toEqual([
      'folio',
      'golden',
      'legacy',
      'minimal',
    ]);
  });

  it('legacy freezes the old production placement', () => {
    const d = legacyLayoutScheme;
    expect(d.styles?.sectionBarWidth).toBe(0.15);
    expect(d.layouts.section?.accentBar).toBe('left');
    expect(d.layouts.title?.titleAlign).toBe('center');
    expect(d.layouts.title?.margin).toBe(0.8);
    expect(d.layouts.content?.margin).toBe(0.6);
    expect(d.layouts.footer?.footerDivider).toBe(false);
    expect(d.layouts.quote?.extra?.quoteMark).toBe(true);
  });

  it('folio is a creative scheme, not a legacy clone', () => {
    const f = folioLayoutScheme;
    // Cover spine + left title (legacy: centered, no spine)
    expect(f.layouts.title?.extra?.spineWidth).toBeGreaterThan(0);
    expect(f.layouts.title?.titleAlign).toBe('left');
    // Section double rules, no side bar (legacy: left bar)
    expect(f.layouts.section?.accentBar).toBe('none');
    expect(f.layouts.section?.extra?.doubleRules).toBe(true);
    // Asymmetric content margins (legacy: symmetric 0.6)
    expect(f.layouts.content?.extra?.marginLeft).toBeGreaterThan(
      f.layouts.content?.extra?.marginRight as number,
    );
    // Pull-quote bar, no giant mark (legacy: quote mark + center)
    expect(f.layouts.quote?.extra?.quoteMark).toBe(false);
    expect(f.layouts.quote?.extra?.quoteBar).toBe(true);
    // Centered footer with divider
    expect(f.layouts.footer?.extra?.footerAlign).toBe('center');
    expect(f.layouts.footer?.footerDivider).toBe(true);
  });

  it('legacy omits new page types; folio includes them', () => {
    expect(legacyLayoutScheme.layouts.closing).toBeUndefined();
    expect(legacyLayoutScheme.layouts.imageSingle).toBeUndefined();
    expect(folioLayoutScheme.layouts.closing?.extra?.thankText).toBe('Thank you');
    expect(folioLayoutScheme.layouts.imageDouble).toBeDefined();
  });

  it('leaves theme.layouts unset when layoutScheme is omitted', () => {
    const theme = getTheme('ocean');
    expect(theme.layouts).toBeUndefined();
    expect(theme.layoutSet).toBeUndefined();
  });

  it('fills theme.layouts/styles/layoutSet when layoutScheme is provided', () => {
    const theme = getTheme('ocean', { layoutScheme: 'folio' });
    expect(theme.layoutSet).toBe('folio');
    expect(theme.layouts?.section?.accentBar).toBe('none');
    expect(theme.layouts?.title?.extra?.spineWidth).toBeGreaterThan(0);

    const old = getTheme('ocean', { layoutScheme: 'legacy' });
    expect(old.layoutSet).toBe('legacy');
    expect(old.layouts?.title?.titleAlign).toBe('center');
    expect(old.layouts?.closing).toBeUndefined();
  });

  it('warns and leaves layouts unset for unknown layout scheme names', () => {
    const theme = getTheme('ocean', { layoutScheme: 'no-such-layout-scheme' });
    expect(theme.layouts).toBeUndefined();
  });

  it('accepts a LayoutScheme object directly', () => {
    const theme = getTheme('ocean', {
      layoutScheme: {
        name: 'custom',
        layouts: { content: { margin: 0.4 } },
        styles: { sectionBarWidth: 0.3 },
      },
    });
    expect(theme.layoutSet).toBe('custom');
    expect(theme.layouts?.content?.margin).toBe(0.4);
  });

  it('keeps red-line Theme fields after layoutScheme resolution', () => {
    const theme = getTheme('ocean', { layoutScheme: 'folio' });
    expect(theme.colors.background).toMatch(/^[0-9A-Fa-f]{6}$/);
    expect(theme.fonts.cjk).toBeTruthy();
    expect(theme.fonts.body).toBeTruthy();
  });
});
