/**
 * PNG size helpers
 */

export interface PngSize {
  width: number;
  height: number;
}

/**
 * Read pixel dimensions from a PNG buffer (IHDR chunk, no dependencies)
 * Returns null when the data is not a valid PNG
 */
export function getPngSize(data: Buffer): PngSize | null {
  if (data.length < 24) return null;
  if (data.readUInt32BE(0) !== 0x89504e47) return null;
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (!(width > 0 && height > 0)) return null;
  return { width, height };
}
