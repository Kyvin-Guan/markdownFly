/**
 * Section divider slide layout
 */

import PptxGenJS from 'pptxgenjs';
import type { SlideNode } from '../../models/slide.js';
import type { Theme } from '../../models/theme.js';

export function renderSectionSlide(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
): void {
  // Accent strip on left
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: 0,
    y: 0,
    w: 0.15,
    h: 7.5,
    fill: { color: theme.colors.accent },
  });

  // Section title centered
  if (node.title) {
    slide.addText(node.title, {
      x: 1.0,
      y: 2.5,
      w: 11.3,
      h: 2.0,
      fontSize: theme.fontSize.heading + 4,
      fontFace: theme.fonts.heading,
      color: theme.colors.text,
      bold: true,
      align: 'left',
      valign: 'middle',
    });
  }
}
