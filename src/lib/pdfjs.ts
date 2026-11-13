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

/**
 * Opens a PDF once and renders pages from it on demand, instead of re-parsing
 * the whole document for every page. Returns each page's canvas plus its
 * displayed size in PDF points (crop box and embedded rotation applied), so
 * callers can rebuild pages at their real physical size.
 */
export async function openPdfForRendering(data: ArrayBuffer) {
  const task = pdfjsLib.getDocument({ data });
  const doc = await task.promise;
  return {
    numPages: doc.numPages,
    async renderPage(pageNumber: number, scale: number) {
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not supported in this browser.');
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      page.cleanup();
      return { canvas, widthPt: base.width, heightPt: base.height };
    },
    destroy: () => task.destroy(),
  };
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
