import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { renderPdfPageToCanvas } from '../../../lib/pdfjs';
import type { Annotation, PageInstance } from './types';

function annotationsForPage(annotations: Annotation[], pageId: string): Annotation[] {
  return annotations.filter((a) => a.pageId === pageId);
}

/** Draws non-redact annotations onto a 2D canvas context, in fractional page coordinates. */
function drawAnnotationsToCanvas(ctx: CanvasRenderingContext2D, list: Annotation[], w: number, h: number) {
  for (const a of list) {
    if (a.type === 'text') {
      ctx.font = `${a.size * h}px sans-serif`;
      ctx.fillStyle = a.color;
      ctx.textBaseline = 'top';
      ctx.fillText(a.text, a.x * w, a.y * h);
    } else if (a.type === 'highlight') {
      ctx.fillStyle = a.color;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(a.x * w, a.y * h, a.w * w, a.h * h);
      ctx.globalAlpha = 1;
    } else if (a.type === 'draw' && a.points.length > 1) {
      ctx.strokeStyle = a.color;
      ctx.lineWidth = a.strokeWidth * w;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo((a.x + a.points[0].x) * w, (a.y + a.points[0].y) * h);
      for (const p of a.points.slice(1)) ctx.lineTo((a.x + p.x) * w, (a.y + p.y) * h);
      ctx.stroke();
    }
    // signature is drawn separately below since it needs async image loading
  }
}

async function drawSignaturesToCanvas(ctx: CanvasRenderingContext2D, list: Annotation[], w: number, h: number) {
  for (const a of list) {
    if (a.type !== 'signature') continue;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('signature image failed'));
      im.src = a.dataUrl;
    });
    ctx.drawImage(img, a.x * w, a.y * h, a.w * w, a.h * h);
  }
}

function drawRedactionsToCanvas(ctx: CanvasRenderingContext2D, list: Annotation[], w: number, h: number) {
  ctx.fillStyle = '#000000';
  for (const a of list) {
    if (a.type !== 'redact') continue;
    ctx.fillRect(a.x * w, a.y * h, a.w * w, a.h * h);
  }
}

/** Rotates a fully-composited canvas by 0/90/180/270 degrees, returning a new canvas. */
function rotateCanvas(source: HTMLCanvasElement, degreesCw: number): HTMLCanvasElement {
  const normalized = ((degreesCw % 360) + 360) % 360;
  if (normalized === 0) return source;
  const swapped = normalized === 90 || normalized === 270;
  const out = document.createElement('canvas');
  out.width = swapped ? source.height : source.width;
  out.height = swapped ? source.width : source.height;
  const ctx = out.getContext('2d')!;
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((normalized * Math.PI) / 180);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return out;
}

export async function exportEditedPdf(
  srcBytes: ArrayBuffer,
  pages: PageInstance[],
  annotations: Annotation[],
  onProgress?: (fraction: number) => void,
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(srcBytes.slice(0));
  const outDoc = await PDFDocument.create();
  const font = await outDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pages.length; i++) {
    const pageInstance = pages[i];
    const pageAnns = annotationsForPage(annotations, pageInstance.id);
    const hasRedaction = pageAnns.some((a) => a.type === 'redact');

    if (!hasRedaction) {
      // Fast, high-quality path: copy the original vector page and draw
      // vector annotations on top. Original text stays selectable/searchable.
      const [copied] = await outDoc.copyPages(srcDoc, [pageInstance.originalIndex]);
      const page = outDoc.addPage(copied);
      const { width, height } = page.getSize();
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + pageInstance.extraRotation));

      for (const a of pageAnns) {
        if (a.type === 'text') {
          page.drawText(a.text, {
            x: a.x * width,
            y: height - a.y * height - a.size * height,
            size: a.size * height,
            font,
            color: hexToRgb(a.color),
          });
        } else if (a.type === 'highlight') {
          page.drawRectangle({
            x: a.x * width,
            y: height - (a.y + a.h) * height,
            width: a.w * width,
            height: a.h * height,
            color: hexToRgb(a.color),
            opacity: 0.35,
          });
        } else if (a.type === 'draw' && a.points.length > 1) {
          const color = hexToRgb(a.color);
          const thickness = Math.max(1, a.strokeWidth * width);
          for (let p = 0; p < a.points.length - 1; p++) {
            const p1 = a.points[p];
            const p2 = a.points[p + 1];
            page.drawLine({
              start: { x: (a.x + p1.x) * width, y: height - (a.y + p1.y) * height },
              end: { x: (a.x + p2.x) * width, y: height - (a.y + p2.y) * height },
              thickness,
              color,
            });
          }
        } else if (a.type === 'signature') {
          const bytes = dataUrlToBytes(a.dataUrl);
          const img = await outDoc.embedPng(bytes);
          page.drawImage(img, {
            x: a.x * width,
            y: height - (a.y + a.h) * height,
            width: a.w * width,
            height: a.h * height,
          });
        }
      }
    } else {
      // Redaction path: rasterize the whole page so the covered content is
      // genuinely gone, not just visually hidden behind a selectable layer.
      const canvas = await renderPdfPageToCanvas(srcBytes.slice(0), pageInstance.originalIndex + 1, 2);
      const ctx = canvas.getContext('2d')!;
      drawAnnotationsToCanvas(ctx, pageAnns, canvas.width, canvas.height);
      await drawSignaturesToCanvas(ctx, pageAnns, canvas.width, canvas.height);
      drawRedactionsToCanvas(ctx, pageAnns, canvas.width, canvas.height); // always last, always on top

      const rotated = rotateCanvas(canvas, pageInstance.extraRotation);
      const jpegDataUrl = rotated.toDataURL('image/jpeg', 0.92);
      const jpegBytes = dataUrlToBytes(jpegDataUrl);
      const jpegImage = await outDoc.embedJpg(jpegBytes);

      const srcPage = srcDoc.getPage(pageInstance.originalIndex);
      const srcSize = srcPage.getSize();
      const swapped = ((pageInstance.extraRotation % 360) + 360) % 360;
      const pageW = swapped === 90 || swapped === 270 ? srcSize.height : srcSize.width;
      const pageH = swapped === 90 || swapped === 270 ? srcSize.width : srcSize.height;
      const newPage = outDoc.addPage([pageW, pageH]);
      newPage.drawImage(jpegImage, { x: 0, y: 0, width: pageW, height: pageH });
    }

    onProgress?.((i + 1) / pages.length);
  }

  return outDoc.save();
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  return Uint8Array.from(atob(dataUrl.split(',')[1]), (c) => c.charCodeAt(0));
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
}
