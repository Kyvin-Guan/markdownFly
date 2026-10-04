/**
 * kai TextScheme — uniform typeface: KaiTi（楷体）.
 */

import { defineUniformTextScheme } from '../../models/text-set.js';
import { sharedCode } from '../text-entries.js';

export const kaiTextScheme = defineUniformTextScheme({
  name: 'kai',
  face: 'KaiTi',
  codeEntry: sharedCode,
  note: '楷体：正文/标题统一 KaiTi，代码 Consolas。',
});
