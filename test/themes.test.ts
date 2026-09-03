import { describe, it, expect } from 'vitest';
import { getTheme, themes, cleanTheme, academicTheme, darkTheme, businessTheme, warmTheme } from '../src/themes/index.js';

describe('Theme System', () => {
  it('should export all 5 preset themes', () => {
    expect(themes.clean).toBeDefined();
    expect(themes.academic).toBeDefined();
    expect(themes.dark).toBeDefined();
    expect(themes.business).toBeDefined();
    expect(themes.warm).toBeDefined();

    expect(cleanTheme.name).toBe('clean');
    expect(academicTheme.name).toBe('academic');
    expect(darkTheme.name).toBe('dark');
    expect(businessTheme.name).toBe('business');
    expect(warmTheme.name).toBe('warm');
  });

  it('should retrieve each preset theme by name (case-insensitive)', () => {
    expect(getTheme('clean').name).toBe('clean');
    expect(getTheme('academic').name).toBe('academic');
    expect(getTheme('DARK').name).toBe('dark');
    expect(getTheme('Business').name).toBe('business');
    expect(getTheme('warm').name).toBe('warm');
  });

  it('should fallback to clean when theme is unknown or empty', () => {
    expect(getTheme(undefined).name).toBe('clean');
    expect(getTheme('').name).toBe('clean');
    expect(getTheme('non-existent-theme').name).toBe('clean');
  });

  it('should support default alias pointing to clean', () => {
    const theme = getTheme('default');
    expect(theme.colors.primary).toBe(cleanTheme.colors.primary);
    expect(theme.colors.background).toBe(cleanTheme.colors.background);
  });
});
