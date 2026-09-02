import { describe, it, expect } from 'vitest';
import { getOutputPath } from '../src/utils/output-namer.js';

describe('Output Namer', () => {
  it('should return specified output if provided', () => {
    const result = getOutputPath('test/fixtures/basic.md', 'custom.pptx');
    expect(result).toBe('custom.pptx');
  });

  it('should replace .md with .pptx if target file does not exist', () => {
    const result = getOutputPath('some/non/existing/path/file.md');
    expect(result.replace(/\\/g, '/')).toBe('some/non/existing/path/file.pptx');
  });
});
