import { useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import DownloadButton from '../../../components/DownloadButton';
import ErrorMessage from '../../../components/ErrorMessage';
import { loadImage, canvasToBlob, formatBytes } from '../../../lib/imageUtils';

export default function ImageCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(0.7);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function compress() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const img = await loadImage(file);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not supported in this browser.');
      const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      if (outType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      const blob = await canvasToBlob(canvas, outType, outType === 'image/jpeg' ? quality : undefined);
      const base = file.name.replace(/\.[^.]+$/, '');
      setResult({ url: URL.createObjectURL(blob), name: `${base}-compressed.${outType === 'image/jpeg' ? 'jpg' : 'png'}`, size: blob.size });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not compress this image.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDropzone accept="image/*" onFiles={(f) => { setFile(f[0]); setResult(null); }} hint="JPG or PNG" />
      ) : (
        <div className="flex items-center justify-between rounded-md border border-line bg-paper-dim p-3">
          <span className="truncate text-sm">{file.name} · {formatBytes(file.size)}</span>
          <button onClick={() => { setFile(null); setResult(null); }} className="text-xs font-medium text-workshop hover:underline">
            Remove
          </button>
        </div>
      )}

      {file?.type !== 'image/png' && (
        <label className="flex items-center gap-3 text-xs text-ink/60">
          Quality
          <input type="range" min={0.1} max={1} step={0.05} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="flex-1" />
          {Math.round(quality * 100)}%
        </label>
      )}
      {file?.type === 'image/png' && (
        <p className="text-xs text-ink/50">PNG is lossless in the browser's encoder, so this re-saves it with optimized encoding rather than a quality slider.</p>
      )}

      <Button onClick={compress} disabled={!file || busy}>{busy ? 'Compressing…' : 'Compress'}</Button>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {result && file && (
        <div className="flex items-center justify-between rounded-md border border-line bg-paper-dim p-3">
          <span className="text-sm">
            {result.name} · {formatBytes(result.size)}
            <span className="ml-1 text-ink/40">
              ({result.size < file.size ? `-${Math.round((1 - result.size / file.size) * 100)}%` : 'no smaller'})
            </span>
          </span>
          <DownloadButton url={result.url} filename={result.name} />
        </div>
      )}
    </div>
  );
}
