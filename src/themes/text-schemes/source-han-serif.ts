/**
 * source-han-serif TextScheme — uniform typeface: 思源宋体.
 * 本机安装名也可能是 Source Han Serif SC / Noto Serif CJK SC，不一致时改 face。
 */

import { defineUniformTextScheme } from '../../models/text-set.js';
import { sharedCode } from '../text-entries.js';

export const sourceHanSerifTextScheme = defineUniformTextScheme({
  name: 'source-han-serif',
  face: '思源宋体',
  codeEntry: sharedCode,
  note: '思源宋体：正文/标题统一思源宋体，代码 Consolas。',
});
