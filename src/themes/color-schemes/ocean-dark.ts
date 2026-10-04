import type { ColorScheme } from '../../models/color-scheme.js';

/**
 * Ocean Dark（深海）— ocean 的暗色对位。
 * paper 深海作底，ink 浅沫作字；primary/secondary 提亮以保证深底对比。
 * 代码块底为派生深色面板 + github-dark 高亮。
 */
export const oceanDarkScheme: ColorScheme = {
  name: 'ocean-dark',
  mode: 'dark',
  ink: 'D6E7F5',
  paper: '0B1C2E',
  primary: '5BAAE8',
  secondary: '8BBCDD',
};
