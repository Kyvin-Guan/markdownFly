/**
 * legacy LayoutScheme — 旧版版式（改造前写死在 layout 函数里的那套）。
 *
 * 仅覆盖旧有基础页：封面 / 章节 / 正文 / 代码 / 引用 + 页脚。
 * 不含结尾页、图文页——使用本方案时，新页型走 layout 函数内硬编码默认。
 */

import type { LayoutScheme } from '../../../models/layout-scheme.js';
import { titleLayout } from './title.js';
import { sectionLayout } from './section.js';
import { contentLayout } from './content.js';
import { codeLayout } from './code.js';
import { quoteLayout } from './quote.js';
import { footerLayout } from './footer.js';
import { legacyLayoutStyles } from './styles.js';

export const legacyLayoutScheme: LayoutScheme = {
  name: 'legacy',
  layouts: {
    title: titleLayout,
    section: sectionLayout,
    content: contentLayout,
    code: codeLayout,
    quote: quoteLayout,
    footer: footerLayout,
  },
  styles: legacyLayoutStyles,
  note: '旧版版式：现网五种基础页 + 页脚；无结尾/图文条目。',
};
