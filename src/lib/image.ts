const FULL_MAX = 2560; // longest edge of the stored wallpaper
const THUMB_MAX = 360; // longest edge of the grid thumbnail

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function drawScaled(bitmap: ImageBitmap, maxEdge: number): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image encoding failed'))), 'image/jpeg', quality),
  );
}

export interface ProcessedImage {
  data: string; // base64 JPEG
  thumb: string; // base64 JPEG
  thumbBlob: Blob;
}

/**
 * Decodes any picked image, downsizes it to a sane wallpaper resolution and builds a thumbnail.
 * Keeps stored files ~0.5-1.5 MB so nothing can blow a storage/bridge limit.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const [fullBlob, thumbBlob] = await Promise.all([
      toJpeg(drawScaled(bitmap, FULL_MAX), 0.9),
      toJpeg(drawScaled(bitmap, THUMB_MAX), 0.8),
    ]);
    return { data: await blobToBase64(fullBlob), thumb: await blobToBase64(thumbBlob), thumbBlob };
  } finally {
    bitmap.close();
  }
}
