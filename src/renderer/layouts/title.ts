/**
 * Title slide layout — cover/opening slide
 */

import PptxGenJS from 'pptxgenjs';
import type { SlideNode } from '../../models/slide.js';
import type { Theme } from '../../models/theme.js';

export function renderTitleSlide(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
): void {
  const textColor = theme.colors.titleText ?? 'FFFFFF';
  const subtitleColor = textColor === 'FFFFFF' ? 'FFFFFFCC' : theme.colors.secondary;
  const metaColor = textColor === 'FFFFFF' ? 'FFFFFF99' : theme.colors.secondary;

  // Gradient themes keep the gradient background on the cover slide too;
  // flat themes fall back to their solid titleBackground / primary design.
  const bgColor = theme.colors.backgroundGradient
    ? undefined
    : theme.colors.titleBackground ?? theme.colors.primary;
  if (bgColor) {
    slide.background = { color: bgColor };
  }
  if (node.title) {
    slide.addText(node.title, {
      x: 0.8,
      y: 2.0,
      w: 11.7,
      h: 1.5,
      fontSize: theme.fontSize.title,
      fontFace: theme.fonts.heading,
      color: textColor,
      bold: true,
      align: 'center',
      valign: 'middle',
    });
  }

  // Subtitle
  if (node.subtitle) {
    slide.addText(node.subtitle, {
      x: 0.8,
      y: 3.8,
      w: 11.7,
      h: 0.8,
      fontSize: theme.fontSize.body,
      fontFace: theme.fonts.body,
      color: subtitleColor,
      align: 'center',
      valign: 'middle',
    });
  }

  // Author / Date from elements
  const textElements = node.elements.filter((e) => e.type === 'text');
  if (textElements.length > 0) {
    const metaText = textElements.map((e) => e.content).join(' · ');
    slide.addText(metaText, {
      x: 0.8,
      y: 5.5,
      w: 11.7,
      h: 0.6,
      fontSize: theme.fontSize.small,
      fontFace: theme.fonts.body,
      color: metaColor,
      align: 'center',
    });
  }
}
