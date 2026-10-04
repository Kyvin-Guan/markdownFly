/**
 * system TextScheme — default. Uniform typeface: 微软雅黑.
 * code 位置使用共享 Consolas 条目。
 */

import { defineUniformTextScheme } from '../../models/text-set.js';
import { sharedCode } from '../text-entries.js';

export const systemTextScheme = defineUniformTextScheme({
  name: 'system',
  face: '微软雅黑',
  codeEntry: sharedCode,
  note: '系统默认：正文/标题统一微软雅黑，代码 Consolas。',
});
