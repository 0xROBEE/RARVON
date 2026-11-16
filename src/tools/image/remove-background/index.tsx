import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import clsx from 'clsx';
import FileDropzone from '../../../components/FileDropzone';
import ErrorMessage from '../../../components/ErrorMessage';
import { ResultCard } from '../../../components/tool';
import { formatBytes } from '../../../lib/imageUtils';
import { BackgroundRemover, WORK_SIZE, downloadStatus } from '../../../lib/backgroundRemoval';

type Tool = 'select' | 'brush-add' | 'brush-erase';
interface Point { x: number; y: number; positive: boolean }
interface Stroke { erase: boolean; size: number; pts: [number, number][] }
interface Snapshot { base: Uint8Array | null; points: Point[]; strokes: Stroke[] }

const COLOURS = ['#ffffff', '#000000', '#f3f4f6', '#fde047', '#f87171', '#60a5fa', '#4ade80'];
const ZOOMS = [1, 1.5, 2, 3, 4];

/** WebGPU with half-precision support, which the high-quality model needs. */
async function detectHqSupport() {
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter: () => Promise<{ features: Set<string> } | null> } }).gpu;
    const adapter = gpu ? await gpu.requestAdapter() : null;
    return Boolean(adapter?.features.has('shader-f16'));
  } catch {
    return false;
  }
}

export default function RemoveBackground() {
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<ImageBitmap | null>(null);
  const [work, setWork] = useState<{ w: number; h: number } | null>(null);
  const [snap, setSnap] = useState<Snapshot>({ base: null, points: [], strokes: [] });
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const [hist, setHist] = useState({ undo: 0, redo: 0 });
  const [tool, setTool] = useState<Tool>('select');
  const [selectAdd, setSelectAdd] = useState(true);
  const [brush, setBrush] = useState(30);
  const [softness, setSoftness] = useState(1);
  const [background, setBackground] = useState<string | null>(null); // null = transparent
  const [crop, setCrop] = useState(false);
  const [padding, setPadding] = useState(20);
  const [showBefore, setShowBefore] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hqSupported, setHqSupported] = useState<boolean | null>(null);
  const [sizes, setSizes] = useState<{ standard: number; hq: number } | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const remover = useRef<BackgroundRemover | null>(null);
  const imageSent = useRef(false);
  const viewRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const workImgRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef<Stroke | null>(null);

  useEffect(() => {
    void detectHqSupport().then(setHqSupported);
    void Promise.all([downloadStatus('standard'), downloadStatus('hq')])
      .then(([s, h]) => setSizes({ standard: s.missing, hq: h.missing }))
      .catch(() => setSizes(null));
    return () => remover.current?.dispose();
  }, []);

  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  // ---- Load a picture
  const handleFile = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    try {
      const bmp = await createImageBitmap(f);
      const scale = Math.min(1, WORK_SIZE / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const wc = document.createElement('canvas');
      wc.width = w;
      wc.height = h;
      wc.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
      workImgRef.current = wc;
      const mc = document.createElement('canvas');
      mc.width = w;
      mc.height = h;
      maskRef.current = mc;
      imageSent.current = false;
      past.current = [];
      future.current = [];
      setHist({ undo: 0, redo: 0 });
      setSnap({ base: null, points: [], strokes: [] });
      setImg(bmp);
      setWork({ w, h });
      setFile(f);
      setResult(null);
      setShowBefore(false);
      setZoom(1);
    } catch {
      setError(`“${f.name}” couldn't be opened as a picture.`);
    }
  };

  const reset = () => {
    img?.close();
    setImg(null);
    setFile(null);
    setWork(null);
    setResult(null);
    setSnap({ base: null, points: [], strokes: [] });
  };

  // ---- History
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const syncHist = () => setHist({ undo: past.current.length, redo: future.current.length });
  const commit = useCallback((next: Snapshot) => {
    past.current = [...past.current.slice(-50), snapRef.current];
    future.current = [];
    snapRef.current = next;
    setSnap(next);
    setHist({ undo: past.current.length, redo: 0 });
    setResult(null);
  }, []);
  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(snap);
    setSnap(prev);
    syncHist();
    setResult(null);
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(snap);
    setSnap(next);
    syncHist();
    setResult(null);
  };

  // ---- AI
  const ensureRemover = async () => {
    if (!remover.current) {
      remover.current = new BackgroundRemover();
      remover.current.onProgress = (loaded, total) => setProgress(total > 0 && loaded < total ? { loaded, total } : null);
    }
    if (!imageSent.current && workImgRef.current) {
      await remover.current.setImage(await createImageBitmap(workImgRef.current));
      imageSent.current = true;
    }
    return remover.current;
  };

  const run = async (label: string, fn: (r: BackgroundRemover) => Promise<{ mask: Uint8Array }>, then: (mask: Uint8Array) => Snapshot) => {
    setError(null);
    setBusy(label);
    try {
      const r = await ensureRemover();
      const { mask } = await fn(r);
      commit(then(mask));
      void Promise.all([downloadStatus('standard'), downloadStatus('hq')]).then(([s, h]) => setSizes({ standard: s.missing, hq: h.missing })).catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  const autoQuick = () => run('Finding the main object…', (r) => r.auto(), (mask) => ({ base: mask, points: [], strokes: [] }));
  const autoHq = () => run('Removing the background in high quality…', (r) => r.autoHq(), (mask) => ({ base: mask, points: [], strokes: [] }));

  const addPoint = (p: Point) => {
    const points = [...snap.points, p];
    void run('Selecting…', (r) => r.select(points), (mask) => ({ base: mask, points, strokes: snap.strokes }));
  };

  // ---- Mask and drawing
  const renderMask = useCallback(() => {
    const mc = maskRef.current;
    if (!mc || !work) return;
    const ctx = mc.getContext('2d')!;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, mc.width, mc.height);
    if (snap.base) {
      const data = new ImageData(mc.width, mc.height);
      for (let i = 0; i < snap.base.length; i++) {
        data.data[i * 4] = 255;
        data.data[i * 4 + 1] = 255;
        data.data[i * 4 + 2] = 255;
        data.data[i * 4 + 3] = snap.base[i];
      }
      ctx.putImageData(data, 0, 0);
    } else {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, mc.width, mc.height);
    }
    const strokes = drawing.current ? [...snap.strokes, drawing.current] : snap.strokes;
    for (const s of strokes) {
      ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
      ctx.strokeStyle = '#fff';
      ctx.fillStyle = '#fff';
      ctx.lineWidth = s.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (s.pts.length === 1) {
        ctx.arc(s.pts[0][0], s.pts[0][1], s.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [snap, work]);

  const draw = useCallback(() => {
    const view = viewRef.current;
    const wc = workImgRef.current;
    const mc = maskRef.current;
    if (!view || !wc || !mc) return;
    const ctx = view.getContext('2d')!;
    ctx.clearRect(0, 0, view.width, view.height);
    if (showBefore) {
      ctx.drawImage(wc, 0, 0);
      return;
    }
    composite(ctx, view.width, view.height, wc, mc, softness, background);
  }, [showBefore, softness, background]);

  useEffect(() => {
    renderMask();
    draw();
  }, [renderMask, draw]);

  const hasCutout = Boolean(snap.base) || snap.strokes.length > 0;

  const toWork = (e: { clientX: number; clientY: number }) => {
    const rect = viewRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * work!.w, y: ((e.clientY - rect.top) / rect.height) * work!.h, scale: work!.w / rect.width };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!work || busy || showBefore) return;
    const { x, y, scale } = toWork(e);
    if (tool === 'select') {
      if (e.button === 2) return; // handled by onContextMenu
      addPoint({ x, y, positive: selectAdd && !e.altKey });
      return;
    }
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawing.current = { erase: tool === 'brush-erase', size: brush * scale, pts: [[x, y]] };
    renderMask();
    draw();
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = viewRef.current!.getBoundingClientRect();
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (!drawing.current) return;
    const { x, y } = toWork(e);
    drawing.current.pts.push([x, y]);
    renderMask();
    draw();
  };
  const onPointerUp = () => {
    const s = drawing.current;
    if (!s) return;
    drawing.current = null;
    commit({ ...snap, strokes: [...snap.strokes, s] });
  };

  // ---- Keyboard: undo/redo, before/after
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---- Export at full resolution
  const exportPng = async () => {
    if (!img || !work || !maskRef.current || !workImgRef.current) return;
    setBusy('Making the PNG…');
    try {
      const W = img.width;
      const H = img.height;
      const full = document.createElement('canvas');
      full.width = W;
      full.height = H;
      composite(full.getContext('2d')!, W, H, img, maskRef.current, softness * (W / work.w), background);
      let out = full;
      if (crop) {
        const box = maskBounds(maskRef.current);
        if (box) {
          const s = W / work.w;
          const pad = padding;
          const x = Math.max(0, Math.floor(box.x * s) - pad);
          const y = Math.max(0, Math.floor(box.y * s) - pad);
          const x2 = Math.min(W, Math.ceil((box.x + box.w) * s) + pad);
          const y2 = Math.min(H, Math.ceil((box.y + box.h) * s) + pad);
          out = document.createElement('canvas');
          out.width = x2 - x;
          out.height = y2 - y;
          out.getContext('2d')!.drawImage(full, x, y, x2 - x, y2 - y, 0, 0, x2 - x, y2 - y);
        }
      }
      const blob = await new Promise<Blob | null>((res) => out.toBlob(res, 'image/png'));
      if (!blob) throw new Error("The PNG couldn't be created.");
      const name = `${file!.name.replace(/\.[^.]+$/, '')}-no-background.png`;
      setResult({ url: URL.createObjectURL(blob), name, size: blob.size });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The PNG couldn't be created.");
    } finally {
      setBusy(null);
    }
  };

  const viewSize = useMemo(() => work ?? { w: 1, h: 1 }, [work]);

  if (!file || !img || !work) {
    return (
      <div className="space-y-4">
        <FileDropzone accept="image/png,image/jpeg,image/webp,image/avif,image/bmp,image/gif" onFiles={(f) => void handleFile(f)} hint="JPG, PNG or WebP" />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <p className="text-sm text-ink-2">
          Click “Remove background” to cut out the main object automatically, or click the object you want to keep. The first time, Bench downloads its AI model once
          {sizes ? ` (${formatBytes(sizes.standard)})` : ''}. After that it works offline.
        </p>
      </div>
    );
  }

  const pending = busy !== null;
  const brushCursor = tool !== 'select' && cursor && !showBefore ? brush : null;

  return (
    <div className="space-y-4" data-testid="bg-remover">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper-dim px-3 py-2 text-sm">
        <span className="truncate">{file.name} · {img.width}×{img.height} · {formatBytes(file.size)}</span>
        <button onClick={reset} className="text-xs font-medium text-workshop hover:underline">Remove</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)_230px]">
        {/* Tools */}
        <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1" role="toolbar" aria-label="Cut-out tools">
          <Section title="Automatic">
            <button
              onClick={() => void autoQuick()}
              disabled={pending}
              className="w-full rounded-md bg-workshop px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Remove background
            </button>
            <button
              onClick={() => void autoHq()}
              disabled={pending || hqSupported === false}
              className="w-full rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
              title={hqSupported === false ? 'Needs a graphics card with WebGPU half-precision support' : undefined}
            >
              High quality (hair, fine edges)
            </button>
            <p className="text-[11px] leading-snug text-ink-3">
              {hqSupported === false
                ? 'High quality needs a newer graphics card and browser (WebGPU). Use the brush to fine-tune edges instead.'
                : sizes && sizes.hq > 0
                  ? `High quality downloads ${formatBytes(sizes.hq)} once.`
                  : 'Best for hair, fur and detailed edges.'}
            </p>
          </Section>

          <Section title="Select by clicking">
            <ToolButton active={tool === 'select'} onClick={() => setTool('select')} icon="M5 3l14 8-6 2-2 6z">Click the object</ToolButton>
            {tool === 'select' && (
              <div className="grid grid-cols-2 gap-1">
                <Seg active={selectAdd} onClick={() => setSelectAdd(true)}>+ Add</Seg>
                <Seg active={!selectAdd} onClick={() => setSelectAdd(false)}>− Remove</Seg>
              </div>
            )}
            {snap.points.length > 0 && (
              <button onClick={() => commit({ ...snap, points: [], base: null })} className="text-start text-[11px] text-ink-3 hover:text-ink">Clear clicks</button>
            )}
          </Section>

          <Section title="Fix by hand">
            <ToolButton active={tool === 'brush-add'} onClick={() => setTool('brush-add')} icon="M12 5v14M5 12h14">Brush: keep</ToolButton>
            <ToolButton active={tool === 'brush-erase'} onClick={() => setTool('brush-erase')} icon="M5 12h14">Brush: erase</ToolButton>
            <Range label="Brush size" value={brush} min={4} max={150} onChange={setBrush} format={(v) => `${v}px`} />
          </Section>

          <Section title="Edges">
            <Range label="Softness" value={softness} min={0} max={10} step={0.5} onChange={setSoftness} format={(v) => (v === 0 ? 'Sharp' : `${v}`)} />
          </Section>
        </div>

        {/* Canvas */}
        <div className="order-first min-w-0 lg:order-none">
          <div
            className="relative grid max-h-[70vh] min-h-[320px] place-items-center overflow-auto rounded-xl border border-line"
            style={{ background: 'repeating-conic-gradient(var(--color-paper-dim) 0% 25%, var(--color-elevated) 0% 50%) 50% / 20px 20px' }}
          >
            <div className="relative" style={{ width: `calc(${zoom} * min(100%, calc((70vh - 2px) * ${viewSize.w / viewSize.h})))`, maxWidth: zoom === 1 ? `${viewSize.w}px` : undefined }}>
              <canvas
                ref={viewRef}
                width={viewSize.w}
                height={viewSize.h}
                data-testid="bg-canvas"
                aria-label={showBefore ? 'Original picture' : 'Picture with the background removed'}
                className={clsx('block h-auto w-full touch-none', tool === 'select' ? 'cursor-crosshair' : 'cursor-none')}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={() => setCursor(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (tool !== 'select' || pending || showBefore || !work) return;
                  const { x, y } = toWork(e);
                  addPoint({ x, y, positive: false });
                }}
              />
              {!showBefore && tool === 'select' && snap.points.map((p, i) => (
                <span
                  key={i}
                  className={clsx('pointer-events-none absolute grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow', p.positive ? 'bg-signal' : 'bg-warn')}
                  style={{ left: `${(p.x / work.w) * 100}%`, top: `${(p.y / work.h) * 100}%` }}
                  aria-hidden="true"
                >
                  {p.positive ? '+' : '−'}
                </span>
              ))}
              {brushCursor && cursor && (
                <span
                  className="pointer-events-none absolute rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
                  style={{ width: brushCursor, height: brushCursor, left: cursor.x - brushCursor / 2, top: cursor.y - brushCursor / 2 }}
                  aria-hidden="true"
                />
              )}
            </div>
            {pending && (
              <div className="absolute inset-0 grid place-items-center bg-black/35" role="status">
                <div className="rounded-lg bg-elevated px-4 py-3 text-center text-sm shadow-lg">
                  <span className="mx-auto mb-2 block h-5 w-5 animate-spin rounded-full border-2 border-line border-t-workshop" aria-hidden="true" />
                  {busy}
                  {progress && (
                    <span className="mt-1 block font-mono text-xs text-ink-3">
                      Downloading the AI model (first time only): {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <IconBtn label="Undo" onClick={undo} disabled={!hist.undo || pending} icon="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3" />
            <IconBtn label="Redo" onClick={redo} disabled={!hist.redo || pending} icon="M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3" />
            <button
              onClick={() => setShowBefore((v) => !v)}
              aria-pressed={showBefore}
              className={clsx(
                'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium',
                showBefore ? 'border-workshop bg-workshop-dim text-workshop' : 'border-line hover:border-ink',
              )}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 3v18M4 6h5v12H4zM15 6h5v12h-5" /></svg>
              {showBefore ? 'Show after' : 'Show before'}
            </button>
            <span className="text-xs text-ink-3">{showBefore ? 'Showing the original' : hasCutout ? 'Showing the result' : ''}</span>
            <div className="ms-auto flex items-center gap-1">
              <IconBtn label="Zoom out" onClick={() => setZoom(ZOOMS[Math.max(0, ZOOMS.indexOf(zoom) - 1)])} disabled={zoom === ZOOMS[0]} icon="M5 12h14" />
              <button onClick={() => setZoom(1)} className="min-w-[48px] rounded-md px-2 py-1 font-mono text-xs text-ink-2 hover:bg-paper-dim" title="Fit">{Math.round(zoom * 100)}%</button>
              <IconBtn label="Zoom in" onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(zoom) + 1)])} disabled={zoom === ZOOMS[ZOOMS.length - 1]} icon="M12 5v14M5 12h14" />
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-3">
            {tool === 'select'
              ? 'Click the object to keep it. Click more parts to add them. Right-click (or choose “− Remove”) to take parts away.'
              : 'Paint over the picture to keep or erase parts. Zoom in for small details.'}
          </p>
        </div>

        {/* Output */}
        <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Section title="Background">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setBackground(null)}
                aria-pressed={background === null}
                aria-label="Transparent"
                title="Transparent"
                className={clsx('h-7 w-7 rounded-full border', background === null ? 'ring-2 ring-workshop ring-offset-1 ring-offset-paper' : 'border-line')}
                style={{ background: 'repeating-conic-gradient(#d4d4d4 0% 25%, #fff 0% 50%) 50% / 8px 8px' }}
              />
              {COLOURS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBackground(c)}
                  aria-pressed={background === c}
                  aria-label={`Background ${c}`}
                  className={clsx('h-7 w-7 rounded-full border border-line', background === c && 'ring-2 ring-workshop ring-offset-1 ring-offset-paper')}
                  style={{ background: c }}
                />
              ))}
              <input type="color" value={background ?? '#ffffff'} onChange={(e) => setBackground(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent" aria-label="Custom background colour" />
            </div>
            <p className="text-[11px] text-ink-3">{background ? 'Solid colour behind the object.' : 'Transparent (PNG).'}</p>
          </Section>
          <Section title="Size">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={crop} onChange={(e) => setCrop(e.target.checked)} className="accent-[var(--color-workshop)]" />
              Crop to the object
            </label>
            {crop && <Range label="Space around it" value={padding} min={0} max={200} onChange={setPadding} format={(v) => `${v}px`} />}
          </Section>
          <button
            onClick={() => void exportPng()}
            disabled={pending || !hasCutout}
            className="w-full rounded-md bg-ink px-3 py-2.5 text-sm font-semibold text-paper hover:opacity-90 disabled:opacity-40"
          >
            Make PNG
          </button>
          {!hasCutout && <p className="text-[11px] text-ink-3">Remove the background or select an object first.</p>}
        </div>
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {result && (
        <ResultCard url={result.url} filename={result.name}>
          {result.name} · {formatBytes(result.size)}
        </ResultCard>
      )}
    </div>
  );
}

/** Draws the picture keeping only what the mask covers, with optional soft edges and a solid background. */
function composite(ctx: CanvasRenderingContext2D, W: number, H: number, image: CanvasImageSource, mask: HTMLCanvasElement, softness: number, background: string | null) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, W, H);
  ctx.globalCompositeOperation = 'destination-in';
  if (softness > 0) ctx.filter = `blur(${softness}px)`;
  ctx.drawImage(mask, 0, 0, W, H);
  ctx.filter = 'none';
  if (background) {
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/** Bounding box of the clearly visible (at least half opaque) part of the mask. */
function maskBounds(mask: HTMLCanvasElement) {
  const { width: w, height: h } = mask;
  const data = mask.getContext('2d')!.getImageData(0, 0, w, h).data;
  let x1 = w;
  let y1 = h;
  let x2 = -1;
  let y2 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] >= 128) {
        if (x < x1) x1 = x;
        if (x > x2) x2 = x;
        if (y < y1) y1 = y;
        if (y > y2) y2 = y;
      }
    }
  }
  return x2 < 0 ? null : { x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1 };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 rounded-xl border border-line bg-elevated p-3">
      <p className="text-xs font-semibold text-ink-2">{title}</p>
      {children}
    </div>
  );
}

function ToolButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: string; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={clsx('flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm', active ? 'border-workshop bg-workshop-dim text-workshop' : 'border-line hover:border-ink')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg>
      {children}
    </button>
  );
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={clsx('rounded-md border px-2 py-1 text-xs font-medium', active ? 'border-workshop bg-workshop-dim text-workshop' : 'border-line hover:border-ink')}>
      {children}
    </button>
  );
}

function Range({ label, value, min, max, step = 1, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-[11px] font-medium text-ink-2">
        {label}
        <span className="font-mono text-ink-3">{format(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} className="w-full accent-[var(--color-workshop)]" />
    </label>
  );
}

function IconBtn({ label, onClick, disabled, icon }: { label: string; onClick: () => void; disabled?: boolean; icon: string }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label} className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-2 hover:border-ink hover:text-ink disabled:opacity-40">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg>
    </button>
  );
}
