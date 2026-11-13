import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import DownloadButton from '../../../components/DownloadButton';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import { formatBytes } from '../../../lib/imageUtils';
import { getPdfPageCount, renderPdfPageToCanvas } from '../../../lib/pdfjs';

export default function CompressPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(0.6);
  const [scale, setScale] = useState(1.2);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);

  function handleFile(files: File[]) {
    setFile(files[0]);
    setResult(null);
    setError(null);
  }

  async function compress() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const bytes = await file.arrayBuffer();
      const pageCount = await getPdfPageCount(bytes.slice(0));
      const outDoc = await PDFDocument.create();

      for (let i = 1; i <= pageCount; i++) {
        const canvas = await renderPdfPageToCanvas(bytes.slice(0), i, scale);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const jpegBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), (c) => c.charCodeAt(0));
        const jpegImage = await outDoc.embedJpg(jpegBytes);
        const page = outDoc.addPage([canvas.width, canvas.height]);
        page.drawImage(jpegImage, { x: 0, y: 0, width: canvas.width, height: canvas.height });
        setProgress(Math.round((i / pageCount) * 100));
      }

      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes as BlobPart], { type: 'application/pdf' });
      const base = file.name.replace(/\.pdf$/i, '');
      setResult({ url: URL.createObjectURL(blob), name: `${base}-compressed.pdf`, size: blob.size });
    } catch {
      setError('Could not compress this PDF. Make sure it is a valid, unencrypted PDF.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDropzone accept="application/pdf" onFiles={handleFile} />
      ) : (
        <div className="flex items-center justify-between rounded-md border border-line bg-paper-dim p-3 text-sm">
          <span className="truncate">{file.name} · {formatBytes(file.size)}</span>
          <button onClick={() => { setFile(null); setResult(null); }} className="text-xs font-medium text-workshop hover:underline">Remove</button>
        </div>
      )}

      {file && (
        <>
          <label className="flex items-center gap-3 text-xs text-ink/60">
            Image quality
            <input type="range" min={0.3} max={0.95} step={0.05} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="flex-1" />
            {Math.round(quality * 100)}%
          </label>
          <label className="flex items-center gap-3 text-xs text-ink/60">
            Resolution
            <input type="range" min={0.7} max={2} step={0.1} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="flex-1" />
            {scale.toFixed(1)}×
          </label>
          <Button onClick={compress} disabled={busy}>{busy ? 'Compressing…' : 'Compress PDF'}</Button>
          {busy && <ProgressBar value={progress} label="Rendering pages" />}
        </>
      )}
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
