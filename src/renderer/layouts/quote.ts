/**
 * Quote slide layout
 */

import PptxGenJS from 'pptxgenjs';
import type { SlideNode } from '../../models/slide.js';
import type { Theme } from '../../models/theme.js';

export function renderQuoteSlide(
  slide: PptxGenJS.Slide,
  node: SlideNode,
  theme: Theme,
): void {
  // Big opening quote mark
  slide.addText('\u201C', {
    x: 1.5,
    y: 1.0,
    w: 2.0,
    h: 1.5,
    fontSize: 72,
    fontFace: 'Georgia',
    color: theme.colors.accent,
    bold: true,
  });

  // Quote text
  const quoteElement = node.elements.find((e) => e.type === 'blockquote');
  if (quoteElement && quoteElement.type === 'blockquote') {
    let quoteText = quoteElement.content;
    let attribution = '';

    // Extract attribution (— Author pattern)
    const attrMatch = quoteText.match(/\n?\s*[—\u2014-]\s*(.+)$/);
    if (attrMatch) {
      attribution = attrMatch[1].trim();
      quoteText = quoteText.slice(0, attrMatch.index).trim();
    }

    slide.addText(quoteText, {
      x: 1.8,
      y: 2.5,
      w: 9.7,
      h: 2.5,
      fontSize: theme.fontSize.heading,
      fontFace: theme.fonts.body,
      color: theme.colors.text,
      italic: true,
      align: 'center',
      valign: 'middle',
    });

    // Attribution
    if (attribution) {
      slide.addText(`— ${attribution}`, {
        x: 1.8,
        y: 5.2,
        w: 9.7,
        h: 0.6,
        fontSize: theme.fontSize.body,
        fontFace: theme.fonts.body,
        color: theme.colors.secondary,
        align: 'right',
      });
    }
  }
}
