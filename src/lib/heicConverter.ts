/**
 * Converts a HEIC/HEIF file to a JPEG blob using the heic2any package if available.
 * Returns the converted blob, or null if conversion fails.
 * The original file is left untouched — always upload the original to the backend.
 */
export async function convertHeicToJpeg(file: File): Promise<Blob | null> {
  if (!isHeicFile(file)) return null;

  try {
    // Dynamic import keeps heic2any out of the initial bundle
    // @ts-ignore
    const heic2any = (await import('heic2any')).default;
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.85,
    });
    return Array.isArray(result) ? result[0] : result;
  } catch (err) {
    console.error('[heicConverter] Conversion failed:', err);
    return null;
  }
}

/** Returns true if the file is a HEIC or HEIF image. */
export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif');
}
