/** Photos larger than this on their long side are made smaller before they are kept. */
const MAX_SIDE = 1600;

/**
 * Turns a chosen file into what is stored. Photos are resized and saved as
 * JPEG, which keeps backups and the phone's storage light; anything the
 * browser cannot draw (or any other file) is kept exactly as it is.
 */
export async function prepareFile(file: File): Promise<{ name: string; type: string; data: ArrayBuffer }> {
  const original = { name: file.name, type: file.type, data: await file.arrayBuffer() };
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return original;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return original;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return original;
    return { name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', data: await blob.arrayBuffer() };
  } catch {
    return original;
  }
}
