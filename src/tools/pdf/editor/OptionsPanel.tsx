import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import Button from '../../../components/Button';
import FileDropzone from '../../../components/FileDropzone';
import type { EditorTool } from './types';

const COLORS = ['#14171c', '#5b56e8', '#2f8f6e', '#b5601f', '#d92b6c', '#1c7ed6'];

interface Props {
  tool: EditorTool;
  color: string;
  onColorChange: (c: string) => void;
  signatureDataUrl: string | null;
  onSignatureReady: (dataUrl: string) => void;
  docInfo: {
    fileName: string;
    fileSize: number;
    pageCount: number;
    currentPageNum: number;
    pageWidthPt: number;
    pageHeightPt: number;
  } | null;
}

function formatBytesLocal(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function ptToIn(pt: number) {
  return (pt / 72).toFixed(1);
}

export default function OptionsPanel({ tool, color, onColorChange, signatureDataUrl, onSignatureReady, docInfo }: Props) {
  const padRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  function pos(e: ReactPointerEvent<HTMLCanvasElement>) {
    const r = padRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function start(e: ReactPointerEvent<HTMLCanvasElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore — fall back to uncaptured pointer tracking.
    }
    e.preventDefault();
    drawing.current = true;
    const ctx = padRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = padRef.current!.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#14171c';
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  function end() {
    drawing.current = false;
  }
  function clearPad() {
    const c = padRef.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
  }
  function usePad() {
    onSignatureReady(padRef.current!.toDataURL('image/png'));
  }
  function uploadSig(files: File[]) {
    const reader = new FileReader();
    reader.onload = () => onSignatureReady(reader.result as string);
    reader.readAsDataURL(files[0]);
  }

  return (
    <div className="h-full space-y-4 overflow-y-auto border-l border-line bg-paper-dim p-4">
      {(tool === 'text' || tool === 'draw' || tool === 'highlight') && (
        <div>
          <p className="mb-2 text-xs font-medium text-ink/60">Color</p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onColorChange(c)}
                aria-label={c}
                className={`h-7 w-7 rounded-full border-2 ${color === c ? 'border-workshop' : 'border-transparent'}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <p className="mt-4 text-xs text-ink/50">
            {tool === 'text' && 'Click anywhere on the page to type.'}
            {tool === 'draw' && 'Click and drag on the page to draw.'}
            {tool === 'highlight' && 'Drag on the page to draw a highlight box.'}
          </p>
        </div>
      )}

      {tool === 'signature' && (
        <div>
          <p className="mb-2 text-xs font-medium text-ink/60">Draw your signature</p>
          <canvas
            ref={padRef}
            width={220}
            height={100}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="w-full touch-none cursor-crosshair rounded-md border border-line bg-white"
          />
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" onClick={clearPad}>Clear</Button>
            <Button onClick={usePad}>Use drawing</Button>
          </div>
          <div className="mt-3">
            <FileDropzone accept="image/png,image/jpeg" onFiles={uploadSig} label="Or drop a signature image" />
          </div>
          {signatureDataUrl && (
            <div className="mt-3 rounded-md border border-line bg-paper p-2">
              <p className="mb-1 text-xs text-ink/50">Ready — drag on the page to place it:</p>
              <img src={signatureDataUrl} alt="Your signature" className="h-10 bg-white" />
            </div>
          )}
        </div>
      )}

      {tool === 'redact' && (
        <div className="space-y-2 text-xs leading-relaxed text-ink/60">
          <p className="font-medium text-ink">Drag on the page to black out an area.</p>
          <p>
            This is real redaction, not a cosmetic overlay: any page you redact is flattened into an image on
            export, so the covered content can't be recovered by selecting or extracting text — the same
            guarantee as printing a page, blacking it out, and rescanning it.
          </p>
          <p className="text-warn">
            The trade-off: once a page has a redaction, its whole text becomes non-selectable and
            non-searchable, not just the blacked-out part. Other pages are unaffected.
          </p>
        </div>
      )}

      {tool === 'select' && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink/40">Document</p>
            {docInfo ? (
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="shrink-0 text-ink/50">Name</dt>
                  <dd className="truncate text-right font-medium" title={docInfo.fileName}>{docInfo.fileName}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink/50">Pages</dt>
                  <dd className="font-medium">{docInfo.pageCount}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink/50">Current page</dt>
                  <dd className="font-medium">{docInfo.currentPageNum} of {docInfo.pageCount}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink/50">Page size</dt>
                  <dd className="font-medium">{ptToIn(docInfo.pageWidthPt)}" × {ptToIn(docInfo.pageHeightPt)}"</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink/50">File size</dt>
                  <dd className="font-medium">{formatBytesLocal(docInfo.fileSize)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-xs text-ink/40">No document loaded.</p>
            )}
          </div>
          <div className="border-t border-line pt-3 text-xs leading-relaxed text-ink/50">
            <strong className="font-medium text-ink">Select</strong> (this tool) lets you click an existing
            annotation to select it, drag to move it, press Delete/Backspace or the × button to remove it, or
            click a text annotation again to edit its wording. Pick another tool above to add something new.
            Page operations — reorder, rotate, duplicate, delete — are on the thumbnails to the left. Nothing
            here is uploaded; everything happens in your browser.
          </div>
        </div>
      )}
    </div>
  );
}
