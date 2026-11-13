import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import { formatBytes } from '../../../lib/imageUtils';
import { openPdfForRendering } from '../../../lib/pdfjs';
import { ResultCard, ActionBar } from '../../../components/tool';

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
      const pdf = await openPdfForRendering(bytes.slice(0));
      const outDoc = await PDFDocument.create();

      try {
        for (let i = 1; i <= pdf.numPages; i++) {
          const { canvas, widthPt, heightPt } = await pdf.renderPage(i, scale);
          const jpegBlob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('JPEG encode failed'))), 'image/jpeg', quality),
          );
          const jpegImage = await outDoc.embedJpg(new Uint8Array(await jpegBlob.arrayBuffer()));
          // Keep the original physical page size (in points); the scale
          // setting only controls how many pixels the page image gets.
          const page = outDoc.addPage([widthPt, heightPt]);
          page.drawImage(jpegImage, { x: 0, y: 0, width: widthPt, height: heightPt });
          canvas.width = 0; // release the canvas backing store early on long documents
          setProgress(Math.round((i / pdf.numPages) * 100));
        }
      } finally {
        void pdf.destroy();
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
          <label className="flex items-center gap-3 text-xs text-ink-2">
            Image quality
            <input type="range" min={0.3} max={0.95} step={0.05} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="flex-1" />
            {Math.round(quality * 100)}%
          </label>
          <label className="flex items-center gap-3 text-xs text-ink-2">
            Resolution
            <input type="range" min={0.7} max={2} step={0.1} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="flex-1" />
            {scale.toFixed(1)}×
          </label>
          <ActionBar><Button onClick={compress} disabled={busy}>{busy ? 'Compressing…' : 'Compress PDF'}</Button></ActionBar>
          {busy && <ProgressBar value={progress} label="Rendering pages" />}
        </>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {result && file && (
        <ResultCard url={result.url} filename={result.name}>{result.name} · {formatBytes(result.size)}
            <span className="ml-1 text-ink-3">
              ({result.size < file.size ? `-${Math.round((1 - result.size / file.size) * 100)}%` : 'no smaller'})
            </span></ResultCard>
      )}
      {result && file && result.size >= file.size && (
        <p className="text-xs text-ink-2">
          The result isn&rsquo;t smaller than your original, so you&rsquo;re better off keeping the original. This method
          works best on scanned or image-heavy PDFs; text-only documents are usually already compact. Lowering quality or
          resolution may help.
        </p>
      )}
    </div>
  );
}
