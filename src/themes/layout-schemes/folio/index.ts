/**
 * folio LayoutScheme — 编辑册页风（创新版式，不仿 legacy）。
 *
 * 设计语言：杂志/技术报告册页
 * - 封面：左侧书脊色带 + 左对齐标题 + 标题下短横线 + 元信息沉底
 * - 章节：无侧边条；上下双横线夹住标题带
 * - 正文：不对称页边距（左宽右窄）+ 标题下粗线（次级色）
 * - 代码：近满幅「图版」式
 * - 引用：左侧竖条 pull-quote，无大引号，出处左对齐
 * - 页脚：分割线 + 居中
 * - 结尾：Thank you 上下短线
 * - 图文：与正文同款不对称边距
 */

import type { LayoutScheme } from '../../../models/layout-scheme.js';
import { titleLayout } from './title.js';
import { sectionLayout } from './section.js';
import { contentLayout } from './content.js';
import { codeLayout } from './code.js';
import { quoteLayout } from './quote.js';
import { closingLayout } from './closing.js';
import { imageSingleLayout, imageDoubleLayout, imageTripleLayout } from './images.js';
import { footerLayout } from './footer.js';
import { folioLayoutStyles } from './styles.js';

export const folioLayoutScheme: LayoutScheme = {
  name: 'folio',
  layouts: {
    title: titleLayout,
    section: sectionLayout,
    content: contentLayout,
    code: codeLayout,
    quote: quoteLayout,
    closing: closingLayout,
    imageSingle: imageSingleLayout,
    imageDouble: imageDoubleLayout,
    imageTriple: imageTripleLayout,
    footer: footerLayout,
  },
  styles: folioLayoutStyles,
  note: '编辑册页：书脊封面、双线章节、不对称正文、pull-quote、页脚居中。',
};
