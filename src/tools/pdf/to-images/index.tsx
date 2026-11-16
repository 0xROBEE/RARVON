import { useState } from 'react';
import JSZip from 'jszip';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import { getPdfPageCount, renderPdfPageToCanvas } from '../../../lib/pdfjs';
import { canvasToBlob } from '../../../lib/imageUtils';
import { ResultCard, ActionBar } from '../../../components/tool';
import { tr } from '../../../lib/i18n';

export default function PdfToImages() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [scale, setScale] = useState(2);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);

  function handleFile(files: File[]) {
    setFile(files[0]);
    setResult(null);
    setError(null);
  }

  async function convert() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const bytes = await file.arrayBuffer();
      const pageCount = await getPdfPageCount(bytes.slice(0));
      const base = file.name.replace(/\.pdf$/i, '');
      const ext = format === 'image/png' ? 'png' : 'jpg';

      if (pageCount === 1) {
        const canvas = await renderPdfPageToCanvas(bytes.slice(0), 1, scale);
        const blob = await canvasToBlob(canvas, format, 0.92);
        setResult({ url: URL.createObjectURL(blob), name: `${base}.${ext}` });
      } else {
        const zip = new JSZip();
        for (let i = 1; i <= pageCount; i++) {
          const canvas = await renderPdfPageToCanvas(bytes.slice(0), i, scale);
          const blob = await canvasToBlob(canvas, format, 0.92);
          zip.file(`${base}-page-${i}.${ext}`, blob);
          setProgress(Math.round((i / pageCount) * 100));
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        setResult({ url: URL.createObjectURL(zipBlob), name: `${base}-images.zip` });
      }
    } catch {
      setError(tr("Could not convert this PDF to images."));
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
          <span className="truncate">{file.name}</span>
          <button onClick={() => { setFile(null); setResult(null); }} className="text-xs font-medium text-workshop hover:underline">{tr("Remove")}</button>
        </div>
      )}

      {file && (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-ink-2">
              {tr("Format")}
              <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)} className="rounded-md border border-line bg-paper px-2 py-1.5 text-xs">
                <option value="image/png">{tr("PNG")}</option>
                <option value="image/jpeg">{tr("JPG")}</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-2">
              {tr("Resolution")}
              <input type="range" min={1} max={4} step={0.5} value={scale} onChange={(e) => setScale(Number(e.target.value))} />
              {scale}×
            </label>
          </div>
          <ActionBar><Button onClick={convert} disabled={busy}>{busy ? tr("Converting…") : tr("Convert to images")}</Button></ActionBar>
          {busy && <ProgressBar value={progress} label={tr("Rendering pages")} />}
        </>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {result && (
        <ResultCard url={result.url} filename={result.name}>{result.name}</ResultCard>
      )}
    </div>
  );
}
