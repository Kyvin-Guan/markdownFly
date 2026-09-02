/**
 * Code-focused slide layout
 */

import PptxGenJS from 'pptxgenjs';
import type { SlideNode } from '../../models/slide.js';
import type { Theme } from '../../models/theme.js';
import type { RenderContext } from './index.js';

export async function renderCodeSlide(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
  ctx: RenderContext,
): Promise<void> {
  let yPos = 0.3;

  // Title
  if (node.title) {
    slide.addText(node.title, {
      x: 0.5,
      y: yPos,
      w: 12.3,
      h: 0.7,
      fontSize: theme.fontSize.heading,
      fontFace: theme.fonts.heading,
      color: theme.colors.primary,
      bold: true,
    });
    yPos += 0.9;
  }

  // Code blocks
  for (const element of node.elements) {
    if (element.type === 'code') {
      const runs = await ctx.highlightCode(element.content, element.language ?? 'text');

      slide.addText(runs, {
        x: 0.5,
        y: yPos,
        w: 12.3,
        h: 7.5 - yPos - 0.5,
        fill: { color: theme.colors.codeBackground },
        color: theme.colors.codeText,
        fontFace: theme.fonts.code,
        fontSize: theme.fontSize.code,
        valign: 'top',
        paraSpaceAfter: 2,
        margin: [10, 15, 10, 15],
      });
      yPos += 5.0;
    }
  }
}
