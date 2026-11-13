import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { renderPdfPageToCanvas } from '../../../lib/pdfjs';
import type { Annotation, EditorTool, PageInstance } from './types';
import { newId } from './types';

interface Props {
  srcBytes: ArrayBuffer;
  page: PageInstance;
  annotations: Annotation[];
  zoomMode: 'fit' | 'custom';
  customZoom: number;
  onZoomResolved: (z: number) => void;
  activeTool: EditorTool;
  color: string;
  signatureDataUrl: string | null;
  onAddAnnotation: (a: Annotation) => void;
  onMoveAnnotation: (id: string, x: number, y: number) => void;
  onUpdateText: (id: string, text: string) => void;
  onDeleteAnnotation: (id: string) => void;
}

interface DragBox { x: number; y: number; w: number; h: number }
interface Bounds { x: number; y: number; w: number; h: number }

const FIT_PADDING = 48; // px breathing room around the page at 100% fit
const CLICK_THRESHOLD = 0.006; // fractional movement below this counts as a click, not a drag

export default function PageCanvas({
  srcBytes, page, annotations, zoomMode, customZoom, onZoomResolved, activeTool, color, signatureDataUrl,
  onAddAnnotation, onMoveAnnotation, onUpdateText, onDeleteAnnotation,
}: Props) {
  const [pageImg, setPageImg] = useState<{ url: string; w: number; h: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fitZoom, setFitZoom] = useState(1);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dragBox, setDragBox] = useState<DragBox | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [drawPoints, setDrawPoints] = useState<{ x: number; y: number }[] | null>(null);
  const [textEditor, setTextEditor] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Select tool state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moveOffset, setMoveOffset] = useState<{ dx: number; dy: number } | null>(null);
  const movingAnnotation = useRef<Annotation | null>(null);

  useEffect(() => {
    setLoading(true);
    setPageImg(null);
    renderPdfPageToCanvas(srcBytes.slice(0), page.originalIndex + 1, 2).then((canvas) => {
      setPageImg({ url: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height });
      setLoading(false);
    });
  }, [srcBytes, page.originalIndex]);

  // Selection shouldn't survive a page switch or a tool change away from Select.
  useEffect(() => {
    setSelectedId(null);
  }, [page.id, activeTool]);

  // Recompute "fit" zoom whenever the available space or the page bitmap
  // changes, so resizing the window or toggling a drawer keeps the page
  // properly fitted rather than leaving it at a stale, tiny scale.
  useEffect(() => {
    const scrollEl = scrollAreaRef.current;
    if (!scrollEl || !pageImg) return;
    const swapped = ((page.extraRotation % 360) + 360) % 360;
    const naturalW = swapped === 90 || swapped === 270 ? pageImg.h : pageImg.w;
    const naturalH = swapped === 90 || swapped === 270 ? pageImg.w : pageImg.h;

    function recompute() {
      const availW = scrollEl!.clientWidth - FIT_PADDING;
      const availH = scrollEl!.clientHeight - FIT_PADDING;
      const next = Math.max(0.1, Math.min(availW / naturalW, availH / naturalH));
      setFitZoom(next);
    }
    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(scrollEl);
    return () => observer.disconnect();
  }, [pageImg, page.extraRotation]);

  const effectiveZoom = zoomMode === 'fit' ? fitZoom : customZoom;

  useEffect(() => {
    onZoomResolved(effectiveZoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveZoom]);

  // Delete/Backspace removes the selected annotation — but never while the
  // text editor is focused, since backspace there means "edit the text."
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!selectedId || textEditor) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteAnnotation(selectedId);
        setSelectedId(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, textEditor, onDeleteAnnotation]);

  function getRelative(e: ReactPointerEvent): { x: number; y: number } {
    const box = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max((e.clientX - box.left) / box.width, 0), 1),
      y: Math.min(Math.max((e.clientY - box.top) / box.height, 0), 1),
    };
  }

  // A single bounding-box shape for every annotation type, in fractional
  // page coordinates — used for both hit-testing (Select tool) and drawing
  // the selection outline. Text has no stored width, so its box is an
  // approximation from its string length and font size, not exact.
  function getBounds(a: Annotation): Bounds {
    if (a.type === 'highlight' || a.type === 'redact' || a.type === 'signature') {
      return { x: a.x, y: a.y, w: a.w, h: a.h };
    }
    if (a.type === 'draw') {
      const xs = a.points.map((p) => p.x);
      const ys = a.points.map((p) => p.y);
      return { x: a.x + Math.min(0, ...xs), y: a.y + Math.min(0, ...ys), w: Math.max(0, ...xs) - Math.min(0, ...xs), h: Math.max(0, ...ys) - Math.min(0, ...ys) };
    }
    // text
    if (!pageImg) return { x: a.x, y: a.y, w: 0.05, h: a.size };
    const fontPx = a.size * pageImg.h * effectiveZoom;
    const approxWidthPx = a.text.length * fontPx * 0.55;
    return { x: a.x, y: a.y, w: approxWidthPx / (pageImg.w * effectiveZoom), h: a.size * 1.3 };
  }

  function hitTest(pos: { x: number; y: number }): Annotation | null {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i];
      const b = getBounds(a);
      if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) return a;
    }
    return null;
  }

  function onPointerDown(e: ReactPointerEvent) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore — fall back to uncaptured pointer tracking.
    }
    const pos = getRelative(e);

    if (activeTool === 'select') {
      e.preventDefault();
      const hit = hitTest(pos);
      if (hit) {
        setSelectedId(hit.id);
        movingAnnotation.current = hit;
        dragStart.current = pos;
        setMoveOffset({ dx: 0, dy: 0 });
      } else {
        setSelectedId(null);
        movingAnnotation.current = null;
      }
      return;
    }

    e.preventDefault();
    if (activeTool === 'text') {
      setTextEditor(pos);
      setTextValue('');
      setEditingId(null);
      return;
    }
    if (activeTool === 'draw') {
      setDrawPoints([{ x: 0, y: 0 }]);
      dragStart.current = pos;
      return;
    }
    dragStart.current = pos;
    setDragBox({ x: pos.x, y: pos.y, w: 0, h: 0 });
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!dragStart.current) return;
    const pos = getRelative(e);

    if (activeTool === 'select' && movingAnnotation.current) {
      setMoveOffset({ dx: pos.x - dragStart.current.x, dy: pos.y - dragStart.current.y });
      return;
    }
    if (activeTool === 'draw' && drawPoints) {
      setDrawPoints((pts) => [...(pts ?? []), { x: pos.x - dragStart.current!.x, y: pos.y - dragStart.current!.y }]);
      return;
    }
    if (dragBox) {
      setDragBox({
        x: Math.min(dragStart.current.x, pos.x),
        y: Math.min(dragStart.current.y, pos.y),
        w: Math.abs(pos.x - dragStart.current.x),
        h: Math.abs(pos.y - dragStart.current.y),
      });
    }
  }

  function onPointerUp() {
    if (activeTool === 'select' && movingAnnotation.current && dragStart.current) {
      const moved = movingAnnotation.current;
      const offset = moveOffset ?? { dx: 0, dy: 0 };
      const distance = Math.hypot(offset.dx, offset.dy);
      if (distance > CLICK_THRESHOLD) {
        onMoveAnnotation(moved.id, moved.x + offset.dx, moved.y + offset.dy);
      } else if (moved.type === 'text') {
        // A real click (not a drag) on a text annotation re-opens it for editing.
        setTextEditor({ x: moved.x, y: moved.y });
        setTextValue(moved.text);
        setEditingId(moved.id);
      }
      movingAnnotation.current = null;
      setMoveOffset(null);
      dragStart.current = null;
      return;
    }

    if (activeTool === 'draw' && drawPoints && dragStart.current && drawPoints.length > 1) {
      onAddAnnotation({
        id: newId(), pageId: page.id, type: 'draw',
        x: dragStart.current.x, y: dragStart.current.y,
        points: drawPoints, color, strokeWidth: 0.004,
      });
    } else if (dragBox && dragBox.w > 0.01 && dragBox.h > 0.01) {
      if (activeTool === 'highlight') {
        onAddAnnotation({ id: newId(), pageId: page.id, type: 'highlight', ...dragBox, color });
      } else if (activeTool === 'redact') {
        onAddAnnotation({ id: newId(), pageId: page.id, type: 'redact', ...dragBox });
      } else if (activeTool === 'signature' && signatureDataUrl) {
        onAddAnnotation({ id: newId(), pageId: page.id, type: 'signature', ...dragBox, dataUrl: signatureDataUrl });
      }
    }
    dragStart.current = null;
    setDragBox(null);
    setDrawPoints(null);
  }

  function commitText() {
    if (textEditor && textValue.trim()) {
      if (editingId) {
        onUpdateText(editingId, textValue);
      } else {
        onAddAnnotation({ id: newId(), pageId: page.id, type: 'text', x: textEditor.x, y: textEditor.y, text: textValue, size: 0.025, color });
      }
    } else if (editingId && !textValue.trim()) {
      // Editing down to an empty string removes the annotation rather than leaving a ghost text box.
      onDeleteAnnotation(editingId);
    }
    setTextEditor(null);
    setTextValue('');
    setEditingId(null);
  }

  const selectedAnnotation = selectedId ? annotations.find((a) => a.id === selectedId) ?? null : null;
  const selectedBounds = selectedAnnotation ? getBounds(selectedAnnotation) : null;
  const liveOffset = movingAnnotation.current && moveOffset ? moveOffset : null;

  return (
    <div ref={scrollAreaRef} className="flex h-full items-center justify-center overflow-auto bg-grid-paper p-6">
      {loading && <p className="text-sm text-ink/40">Rendering page…</p>}
      {pageImg && (
        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className={`relative shrink-0 select-none rounded shadow-lg ${activeTool === 'select' && !movingAnnotation.current ? '' : 'touch-none'}`}
          style={{
            width: pageImg.w * effectiveZoom,
            height: pageImg.h * effectiveZoom,
            transform: `rotate(${page.extraRotation}deg)`,
            cursor: activeTool === 'select' ? (selectedAnnotation ? 'grab' : 'default') : 'crosshair',
          }}
        >
          <img src={pageImg.url} alt="Page" className="pointer-events-none block h-full w-full" draggable={false} />

          {annotations.map((a) => {
            const isMoving = liveOffset && a.id === selectedId;
            const dx = isMoving ? liveOffset!.dx : 0;
            const dy = isMoving ? liveOffset!.dy : 0;

            if (a.type === 'text') {
              return (
                <div key={a.id} style={{ position: 'absolute', left: `${(a.x + dx) * 100}%`, top: `${(a.y + dy) * 100}%`, fontSize: a.size * (pageImg.h * effectiveZoom), color: a.color, whiteSpace: 'nowrap' }}>
                  {a.text}
                </div>
              );
            }
            if (a.type === 'highlight') {
              return <div key={a.id} style={{ position: 'absolute', left: `${(a.x + dx) * 100}%`, top: `${(a.y + dy) * 100}%`, width: `${a.w * 100}%`, height: `${a.h * 100}%`, background: a.color, opacity: 0.35 }} />;
            }
            if (a.type === 'redact') {
              return <div key={a.id} style={{ position: 'absolute', left: `${(a.x + dx) * 100}%`, top: `${(a.y + dy) * 100}%`, width: `${a.w * 100}%`, height: `${a.h * 100}%`, background: '#000' }} />;
            }
            if (a.type === 'signature') {
              return <img key={a.id} src={a.dataUrl} alt="Signature" style={{ position: 'absolute', left: `${(a.x + dx) * 100}%`, top: `${(a.y + dy) * 100}%`, width: `${a.w * 100}%`, height: `${a.h * 100}%`, objectFit: 'contain' }} />;
            }
            if (a.type === 'draw') {
              const pts = a.points.map((p) => `${(a.x + dx + p.x) * 100},${(a.y + dy + p.y) * 100}`).join(' ');
              return (
                <svg key={a.id} viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
                  <polyline points={pts} fill="none" stroke={a.color} strokeWidth={Math.max(1.5, a.strokeWidth * (pageImg.w * effectiveZoom))} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
              );
            }
            return null;
          })}

          {activeTool === 'select' && selectedAnnotation && selectedBounds && (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: `${(selectedBounds.x + (liveOffset?.dx ?? 0)) * 100}%`,
                  top: `${(selectedBounds.y + (liveOffset?.dy ?? 0)) * 100}%`,
                  width: `${selectedBounds.w * 100}%`,
                  height: `${selectedBounds.h * 100}%`,
                  outline: '2px dashed var(--color-workshop)',
                  outlineOffset: 3,
                  pointerEvents: 'none',
                }}
              />
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  onDeleteAnnotation(selectedAnnotation.id);
                  setSelectedId(null);
                }}
                title="Delete selected annotation"
                aria-label="Delete selected annotation"
                className="absolute flex h-6 w-6 items-center justify-center rounded-full border border-line bg-elevated text-warn shadow hover:bg-warn-dim"
                style={{
                  left: `calc(${(selectedBounds.x + selectedBounds.w + (liveOffset?.dx ?? 0)) * 100}% + 4px)`,
                  top: `calc(${(selectedBounds.y + (liveOffset?.dy ?? 0)) * 100}% - 10px)`,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </>
          )}

          {dragBox && (activeTool === 'highlight' || activeTool === 'redact' || activeTool === 'signature') && (
            <div
              style={{
                position: 'absolute', left: `${dragBox.x * 100}%`, top: `${dragBox.y * 100}%`, width: `${dragBox.w * 100}%`, height: `${dragBox.h * 100}%`,
                background: activeTool === 'redact' ? '#000' : color, opacity: activeTool === 'redact' ? 1 : 0.35,
                border: '1px dashed var(--color-workshop)',
              }}
            />
          )}
          {drawPoints && dragStart.current && (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
              <polyline
                points={drawPoints.map((p) => `${(dragStart.current!.x + p.x) * 100},${(dragStart.current!.y + p.y) * 100}`).join(' ')}
                fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}

          {textEditor && (
            <input
              autoFocus
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onBlur={commitText}
              onKeyDown={(e) => e.key === 'Enter' && commitText()}
              style={{ position: 'absolute', left: `${textEditor.x * 100}%`, top: `${textEditor.y * 100}%`, color, fontSize: 0.025 * (pageImg.h * effectiveZoom) }}
              className="bg-paper/90 outline-none"
            />
          )}
        </div>
      )}
    </div>
  );
}
