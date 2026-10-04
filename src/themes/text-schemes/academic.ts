/**
 * academic TextScheme — uniform typeface: 宋体.
 * Titles sized up for the `blue` theme package (user request).
 */

import { defineUniformTextScheme } from '../../models/text-set.js';
import { sharedCode } from '../text-entries.js';

export const academicTextScheme = defineUniformTextScheme({
  name: 'academic',
  face: '宋体',
  codeEntry: sharedCode,
  sizes: {
    coverTitle: 42,
    slideTitle: 32,
  },
  note: '学术：正文/标题统一宋体，代码 Consolas；标题加大（封面 42 / 页标题 32）。',
});
