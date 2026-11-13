import { useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import DownloadButton from '../../../components/DownloadButton';
import ErrorMessage from '../../../components/ErrorMessage';
import { loadImage, canvasToBlob, formatBytes } from '../../../lib/imageUtils';

/** Palette sizes for PNG. 0 = lossless re-compression (no colour reduction). */
const PNG_LEVELS = [
  { colors: 256, label: '256 colours', hint: 'usually indistinguishable — best for screenshots, logos, graphics' },
  { colors: 128, label: '128 colours', hint: 'smaller, slight banding in gradients' },
  { colors: 64, label: '64 colours', hint: 'much smaller, visible on photos' },
  { colors: 0, label: 'Lossless', hint: 'same pixels, better compression only' },
];

function quantizePng(rgba: ArrayBuffer, width: number, height: number, colors: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../../../lib/pngQuant.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ png?: ArrayBuffer; error?: string }>) => {
      worker.terminate();
      if (e.data.png) resolve(new Blob([e.data.png], { type: 'image/png' }));
      else reject(new Error(e.data.error ?? 'PNG compression failed.'));
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error('PNG compression failed.'));
    };
    worker.postMessage({ rgba, width, height, colors }, [rgba]);
  });
}

export default function ImageCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(0.7);
  const [colors, setColors] = useState(256);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isPng = file?.type === 'image/png' || /\.png$/i.test(file?.name ?? '');
  const isWebp = file?.type === 'image/webp';

  async function compress() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const img = await loadImage(file);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: isPng });
      if (!ctx) throw new Error('Canvas is not supported in this browser.');
      const base = file.name.replace(/\.[^.]+$/, '');
      let blob: Blob;
      let ext: string;
      if (isPng) {
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        blob = await quantizePng(data.buffer, canvas.width, canvas.height, colors);
        ext = 'png';
      } else {
        // WebP stays WebP (keeps transparency); everything else becomes JPEG.
        const outType = isWebp ? 'image/webp' : 'image/jpeg';
        if (outType === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        blob = await canvasToBlob(canvas, outType, quality);
        ext = outType === 'image/webp' ? 'webp' : 'jpg';
      }
      setResult({ url: URL.createObjectURL(blob), name: `${base}-compressed.${ext}`, size: blob.size });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not compress this image.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDropzone accept="image/*" onFiles={(f) => { setFile(f[0]); setResult(null); setError(null); }} hint="JPG, PNG or WebP" />
      ) : (
        <div className="flex items-center justify-between rounded-md border border-line bg-paper-dim p-3">
          <span className="truncate text-sm">{file.name} · {formatBytes(file.size)}</span>
          <button onClick={() => { setFile(null); setResult(null); }} className="text-xs font-medium text-workshop hover:underline">
            Remove
          </button>
        </div>
      )}

      {file && !isPng && (
        <label className="flex items-center gap-3 text-xs text-ink/60">
          Quality
          <input type="range" min={0.1} max={1} step={0.05} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="flex-1" aria-label="Quality" />
          {Math.round(quality * 100)}%
        </label>
      )}
      {file && isPng && (
        <fieldset className="space-y-1.5" disabled={busy}>
          <legend className="mb-1 text-xs font-medium text-ink/60">PNG compression</legend>
          {PNG_LEVELS.map((l) => (
            <label key={l.colors} className="flex items-center gap-2 text-sm">
              <input type="radio" name="png-colors" checked={colors === l.colors} onChange={() => setColors(l.colors)} />
              {l.label} <span className="text-xs text-ink/50">— {l.hint}</span>
            </label>
          ))}
          <p className="pt-1 text-xs text-ink/50">Transparency is kept. Reducing to a colour palette is how PNGs get dramatically smaller.</p>
        </fieldset>
      )}

      <Button onClick={compress} disabled={!file || busy}>{busy ? 'Compressing…' : 'Compress'}</Button>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {result && file && (
        result.size < file.size ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper-dim p-3">
            <span className="text-sm">
              {result.name} · {formatBytes(result.size)}
              <span className="ml-1 text-signal">(−{Math.round((1 - result.size / file.size) * 100)}%)</span>
            </span>
            <DownloadButton url={result.url} filename={result.name} />
          </div>
        ) : (
          <ErrorMessage>
            This image is already well compressed — the result ({formatBytes(result.size)}) isn’t smaller than the original
            ({formatBytes(file.size)}). Keep your original, or try {isPng ? 'fewer colours' : 'a lower quality'}.
          </ErrorMessage>
        )
      )}
    </div>
  );
}
