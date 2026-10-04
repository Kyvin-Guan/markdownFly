/**
 * Built-in LayoutScheme registry — 主题体系中的版式集。
 *
 * 数据流与色彩集 / 文字集相同：
 *   layout-schemes/<name>/  →  getTheme(..., { layoutScheme })  →  Theme.layouts/styles
 *
 * 一套版式方案 = 一个文件夹。内置：
 *   - legacy：旧版（改造前写死摆法）
 *   - folio：编辑册页（创新版式，不仿 legacy）
 *   - golden：黄金比例（右对齐留白 + 黄金分割横线）
 *   - minimal：极简档案（统一 0.83 边距 + 线性装饰 + 超大章序号）
 *
 * `test/layout-schemes-folder.test.ts`：文件夹 ↔ 注册表一致性。
 */

import type { LayoutScheme } from '../../models/layout-scheme.js';
import { folioLayoutScheme } from './folio/index.js';
import { legacyLayoutScheme } from './legacy/index.js';
import { goldenLayoutScheme } from './golden/index.js';
import { minimalLayoutScheme } from './minimal/index.js';

/** All built-in schemes. Keep in sync with scheme folders in this directory. */
const builtInLayoutSchemes: LayoutScheme[] = [
  folioLayoutScheme,
  legacyLayoutScheme,
  goldenLayoutScheme,
  minimalLayoutScheme,
];

export const layoutSchemes: Record<string, LayoutScheme> = Object.fromEntries(
  builtInLayoutSchemes.map((s) => [s.name.toLowerCase(), s]),
);

export function getLayoutScheme(name?: string): LayoutScheme | undefined {
  if (!name) return undefined;
  return layoutSchemes[name.toLowerCase()];
}

export function listLayoutSchemes(): LayoutScheme[] {
  return Object.values(layoutSchemes);
}

export function registerLayoutScheme(scheme: LayoutScheme): void {
  layoutSchemes[scheme.name.toLowerCase()] = scheme;
}

export {
  folioLayoutScheme,
  legacyLayoutScheme,
  goldenLayoutScheme,
  minimalLayoutScheme,
};
