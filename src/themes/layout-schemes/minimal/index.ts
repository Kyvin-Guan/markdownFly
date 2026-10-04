/**
 * minimal LayoutScheme — 极简档案风（第四套版式方案）。
 *
 * 设计语言：统一几何 + 线性装饰 + 清晰分层
 * - 封面：左侧竖装饰线 + 左对齐标题堆叠 + 作者/日期沉底
 * - 章节：超大章节序号（01 自动递增）+ 竖分隔线 + 标题
 * - 正文：标题 + 标题下短横线（非贯穿）+ 带边框内容容器
 * - 代码：标题 + 短横线 + 独立圆角代码卡片
 * - 引用：左侧竖引用标记 + 左对齐引用文字
 * - 结尾：上方短横线（居中）+ 致谢语 + 联系方式，无页脚
 * - 图文：标题 + 短横线 + 虚线图片占位框
 * - 页脚：分割线 + 文案/页码，几何 y=6.94/7.03 全局统一
 *
 * 全部页面统一左右边距 0.83 英寸，装饰仅用「短横线 / 竖线」两类线性装饰。
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
import { minimalLayoutStyles } from './styles.js';

export const minimalLayoutScheme: LayoutScheme = {
  name: 'minimal',
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
  styles: minimalLayoutStyles,
  note: '极简档案：统一0.83边距、横/竖线性装饰、超大章序号、圆角代码卡片、虚线图片占位。',
};
