import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import DownloadButton from '../../../components/DownloadButton';
import ErrorMessage from '../../../components/ErrorMessage';
import { loadImage, canvasToBlob, formatBytes } from '../../../lib/imageUtils';
import { getSupportedEncodeFormats } from '../../../lib/imageFormatSupport';
import type { ImageFormatOption } from '../../../lib/imageFormatSupport';
import { resolutionPresets, socialPresets } from '../../../lib/resizePresets';

const MAX_PREVIEW_DIM = 380;
const MIN_DIM = 8;
const MAX_DIM = 10000;
const DEBOUNCE_MS = 300;

export default function ImageResize() {
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [original, setOriginal] = useState<{ w: number; h: number } | null>(null);

  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [lockRatio, setLockRatio] = useState(true);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [format, setFormat] = useState<ImageFormatOption | null>(null);
  const [quality, setQuality] = useState(0.9);

  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [cachedBlob, setCachedBlob] = useState<Blob | null>(null);

  const [result, setResult] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dragRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const encodeFormats = getSupportedEncodeFormats();

  async function handleFile(files: File[]) {
    const f = files[0];
    setFile(f);
    setResult(null);
    setError(null);
    setEstimatedSize(null);
    setCachedBlob(null);
    try {
      const image = await loadImage(f);
      setImg(image);
      setOriginal({ w: image.naturalWidth, h: image.naturalHeight });
      setWidth(image.naturalWidth);
      setHeight(image.naturalHeight);
      const preferred = encodeFormats.find((fmt) => fmt.mime === f.type) ?? encodeFormats[0] ?? null;
      setFormat(preferred);
    } catch {
      setError('Could not read this image.');
    }
  }

  function setDimensions(w: number, h: number) {
    setWidth(Math.round(Math.min(MAX_DIM, Math.max(MIN_DIM, w))));
    setHeight(Math.round(Math.min(MAX_DIM, Math.max(MIN_DIM, h))));
  }

  function onWidthChange(v: number) {
    if (lockRatio && original) setDimensions(v, (v / original.w) * original.h);
    else setDimensions(v, height);
  }
  function onHeightChange(v: number) {
    if (lockRatio && original) setDimensions((v / original.h) * original.w, v);
    else setDimensions(width, v);
  }
  function onPercentChange(pct: number) {
    if (!original) return;
    setDimensions((pct / 100) * original.w, (pct / 100) * original.h);
  }
  function applyPreset(w: number, h: number) {
    setDimensions(w, h);
  }

  // Debounced "live" re-encode: this is a real encode of the current target
  // canvas, not a formula-based guess, so the size shown is accurate for
  // these exact settings — just possibly a beat behind the very latest drag.
  useEffect(() => {
    if (!img || !format) return;
    setEstimating(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        if (format.mime === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        const supportsQuality = format.mime === 'image/jpeg' || format.mime === 'image/webp' || format.mime === 'image/avif';
        const blob = await canvasToBlob(canvas, format.mime, supportsQuality ? quality : undefined);
        setCachedBlob(blob);
        setEstimatedSize(blob.size);
      } catch {
        setEstimatedSize(null);
      } finally {
        setEstimating(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [img, width, height, format, quality]);

  function onHandlePointerDown(e: ReactPointerEvent) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore — fall back to uncaptured pointer tracking.
    }
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startW: width, startH: height };
  }
  function onHandlePointerMove(e: ReactPointerEvent) {
    if (!dragRef.current || !original) return;
    const displayScale = Math.min(1, MAX_PREVIEW_DIM / Math.max(dragRef.current.startW, dragRef.current.startH));
    const dxReal = (e.clientX - dragRef.current.startX) / displayScale;
    const dyReal = (e.clientY - dragRef.current.startY) / displayScale;
    if (lockRatio) {
      const delta = Math.abs(dxReal) > Math.abs(dyReal) ? dxReal : dyReal * (original.w / original.h);
      const newW = dragRef.current.startW + delta;
      setDimensions(newW, (newW / original.w) * original.h);
    } else {
      setDimensions(dragRef.current.startW + dxReal, dragRef.current.startH + dyReal);
    }
  }
  function onHandlePointerUp() {
    dragRef.current = null;
  }

  async function download() {
    if (!file || !format) return;
    setBusy(true);
    setError(null);
    try {
      let blob = cachedBlob;
      if (!blob) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx || !img) throw new Error('Canvas is not supported in this browser.');
        if (format.mime === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        const supportsQuality = format.mime === 'image/jpeg' || format.mime === 'image/webp' || format.mime === 'image/avif';
        blob = await canvasToBlob(canvas, format.mime, supportsQuality ? quality : undefined);
      }
      const base = file.name.replace(/\.[^.]+$/, '');
      setResult({ url: URL.createObjectURL(blob), name: `${base}-${width}x${height}.${format.extension}` });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resize this image.');
    } finally {
      setBusy(false);
    }
  }

  const displayScale = original ? Math.min(1, MAX_PREVIEW_DIM / Math.max(width, height)) : 1;
  const previewW = width * displayScale;
  const previewH = height * displayScale;
  const percent = original ? Math.round((width / original.w) * 100) : 100;
  const supportsQuality = format && (format.mime === 'image/jpeg' || format.mime === 'image/webp' || format.mime === 'image/avif');

  return (
    <div className="space-y-5">
      {!file ? (
        <FileDropzone accept="image/*" onFiles={handleFile} />
      ) : (
        <div className="flex items-center justify-between rounded-md border border-line bg-paper-dim p-3">
          <span className="truncate text-sm">{file.name}</span>
          <button
            onClick={() => { setFile(null); setImg(null); setOriginal(null); setResult(null); }}
            className="text-xs font-medium text-workshop hover:underline"
          >
            Remove
          </button>
        </div>
      )}

      {file && original && img && (
        <>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <div
              className="relative shrink-0 select-none rounded-md border border-line bg-grid-paper"
              style={{ width: MAX_PREVIEW_DIM, height: MAX_PREVIEW_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div className="relative" style={{ width: previewW, height: previewH }}>
                <img src={img.src} alt="Preview" className="block h-full w-full rounded-sm object-fill shadow-sm" draggable={false} />
                <div
                  onPointerDown={onHandlePointerDown}
                  onPointerMove={onHandlePointerMove}
                  onPointerUp={onHandlePointerUp}
                  onPointerLeave={onHandlePointerUp}
                  role="slider"
                  aria-label="Drag to resize"
                  aria-valuenow={width}
                  tabIndex={0}
                  className="absolute -right-1.5 -bottom-1.5 h-4 w-4 touch-none cursor-nwse-resize rounded-full border-2 border-paper bg-workshop shadow"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-md border border-line bg-paper-dim p-3">
                  <p className="text-ink/50">Original</p>
                  <p className="mt-0.5 font-display text-sm font-semibold">{original.w} × {original.h}</p>
                  <p className="text-ink/40">{formatBytes(file.size)}</p>
                </div>
                <div className="rounded-md border border-line bg-paper-dim p-3">
                  <p className="text-ink/50">Current</p>
                  <p className="mt-0.5 font-display text-sm font-semibold">{width} × {height}</p>
                  <p className="text-ink/40">
                    {estimating ? 'estimating…' : estimatedSize !== null ? `~${formatBytes(estimatedSize)} (estimated)` : '—'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs text-ink/60">
                  Width
                  <input type="number" value={width} onChange={(e) => onWidthChange(Number(e.target.value))} className="mt-1 block w-24 rounded-md border border-line bg-paper px-2 py-1.5 text-sm" />
                </label>
                <label className="text-xs text-ink/60">
                  Height
                  <input type="number" value={height} onChange={(e) => onHeightChange(Number(e.target.value))} className="mt-1 block w-24 rounded-md border border-line bg-paper px-2 py-1.5 text-sm" />
                </label>
                <button
                  onClick={() => setLockRatio((v) => !v)}
                  aria-pressed={lockRatio}
                  title={lockRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                  className={`mb-0.5 flex h-8 w-8 items-center justify-center rounded-md border ${lockRatio ? 'border-workshop bg-workshop-dim text-workshop' : 'border-line text-ink/50'}`}
                >
                  {lockRatio ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="1" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="1" /><path d="M8 11V7a4 4 0 017.6-1.8" /></svg>
                  )}
                </button>
              </div>

              <label className="flex items-center gap-3 text-xs text-ink/60">
                Scale
                <input type="range" min={5} max={200} value={percent} onChange={(e) => onPercentChange(Number(e.target.value))} className="flex-1 max-w-xs" />
                <span className="w-12 text-right font-mono">{percent}%</span>
              </label>
            </div>
          </div>

          <div>
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-ink/60 hover:text-ink"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={showAdvanced ? 'rotate-90' : ''}>
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Advanced
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-4 rounded-md border border-line bg-paper-dim p-4">
                <div>
                  <p className="mb-2 text-xs font-medium text-ink/60">Resolution presets</p>
                  <div className="flex flex-wrap gap-2">
                    {resolutionPresets.map((p) => (
                      <button key={p.label} onClick={() => applyPreset(p.width, p.height)} className="rounded-md border border-line bg-paper px-2.5 py-1 text-xs hover:border-ink">
                        {p.label} <span className="text-ink/40">({p.width}×{p.height})</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-ink/60">Social media presets</p>
                  <div className="flex flex-wrap gap-2">
                    {socialPresets.map((p) => (
                      <button key={p.label} onClick={() => applyPreset(p.width, p.height)} className="rounded-md border border-line bg-paper px-2.5 py-1 text-xs hover:border-ink">
                        {p.label} <span className="text-ink/40">({p.width}×{p.height})</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-ink/60">
                    Output format
                    <select
                      value={format?.mime ?? ''}
                      onChange={(e) => setFormat(encodeFormats.find((f) => f.mime === e.target.value) ?? null)}
                      className="rounded-md border border-line bg-paper px-2 py-1.5 text-xs"
                    >
                      {encodeFormats.map((f) => (
                        <option key={f.mime} value={f.mime}>{f.label}</option>
                      ))}
                    </select>
                  </label>
                  {supportsQuality && (
                    <label className="flex items-center gap-3 text-xs text-ink/60">
                      Quality
                      <input type="range" min={0.3} max={1} step={0.05} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-32" />
                      {Math.round(quality * 100)}%
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          <Button onClick={download} disabled={busy || !format}>{busy ? 'Preparing…' : 'Resize image'}</Button>
        </>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {result && (
        <div className="flex items-center justify-between rounded-md border border-line bg-paper-dim p-3">
          <span className="text-sm">{result.name}</span>
          <DownloadButton url={result.url} filename={result.name} />
        </div>
      )}
    </div>
  );
}
