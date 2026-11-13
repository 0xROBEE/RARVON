import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function renderPdfPageToCanvas(
  data: ArrayBuffer,
  pageNumber: number,
  scale = 1.5,
): Promise<HTMLCanvasElement> {
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser.');
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  await doc.cleanup();
  return canvas;
}

export async function getPdfPageCount(data: ArrayBuffer): Promise<number> {
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const count = doc.numPages;
  await doc.cleanup();
  return count;
}

export async function renderAllThumbnails(data: ArrayBuffer, scale = 0.3): Promise<string[]> {
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const urls: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported in this browser.');
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    urls.push(canvas.toDataURL('image/png'));
  }
  await doc.cleanup();
  return urls;
}
