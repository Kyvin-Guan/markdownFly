/**
 * golden LayoutScheme — 黄金比例版式。
 *
 * 设计语言：右对齐 + 留白 + 黄金分割横线
 * - 封面：右上方标题，标题下一条黄金横线，横线下作者与日期
 * - 章节：序号与标题右对齐，标题下同一条黄金横线
 * - 正文：左对齐标题 + 短装饰线，内容区满幅，底部页脚
 * - 代码：与正文同骨架，内容区替换为圆角代码容器
 * - 引用：居中极简，文本上方一条居中短横线
 * - 结尾：右对齐致谢语 + 黄金横线 + 联系方式
 * - 图文：与正文同款骨架
 *
 * 黄金分割取值：页面 13.33 × 7.50，
 *   横线长 8.22 ≈ W × 0.618，横线 y=4.64 将页高分为 1.618:1。
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
import { goldenLayoutStyles } from './styles.js';

export const goldenLayoutScheme: LayoutScheme = {
  name: 'golden',
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
  styles: goldenLayoutStyles,
  note: '黄金比例：右对齐留白封面/章节/结尾 + 黄金分割横线，正文/代码/引用/图文共用骨架语言。',
};
