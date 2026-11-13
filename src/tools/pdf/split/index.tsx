import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import DownloadButton from '../../../components/DownloadButton';
import ErrorMessage from '../../../components/ErrorMessage';
import { getPdfPageCount } from '../../../lib/pdfjs';

export default function SplitPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<'each' | 'range'>('each');
  const [range, setRange] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);

  async function handleFile(files: File[]) {
    const f = files[0];
    setFile(f);
    setResult(null);
    setError(null);
    try {
      const count = await getPdfPageCount(await f.arrayBuffer());
      setPageCount(count);
      setRange(`1-${count}`);
    } catch {
      setError('Could not read this PDF.');
    }
  }

  function parseRange(input: string, max: number): number[] {
    const pages = new Set<number>();
    for (const part of input.split(',').map((p) => p.trim()).filter(Boolean)) {
      const m = part.match(/^(\d+)(?:-(\d+))?$/);
      if (!m) continue;
      const start = Number(m[1]);
      const end = m[2] ? Number(m[2]) : start;
      for (let p = start; p <= end; p++) if (p >= 1 && p <= max) pages.add(p);
    }
    return Array.from(pages).sort((a, b) => a - b);
  }

  async function split() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(bytes);
      const base = file.name.replace(/\.pdf$/i, '');

      if (mode === 'range') {
        const pages = parseRange(range, pageCount);
        if (!pages.length) throw new Error('No valid pages in that range.');
        const outDoc = await PDFDocument.create();
        const copied = await outDoc.copyPages(srcDoc, pages.map((p) => p - 1));
        copied.forEach((p) => outDoc.addPage(p));
        const outBytes = await outDoc.save();
        const blob = new Blob([outBytes as BlobPart], { type: 'application/pdf' });
        setResult({ url: URL.createObjectURL(blob), name: `${base}-pages-${range.replace(/,/g, '_')}.pdf` });
      } else {
        const zip = new JSZip();
        for (let i = 0; i < srcDoc.getPageCount(); i++) {
          const outDoc = await PDFDocument.create();
          const [copied] = await outDoc.copyPages(srcDoc, [i]);
          outDoc.addPage(copied);
          const outBytes = await outDoc.save();
          zip.file(`${base}-page-${i + 1}.pdf`, outBytes);
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        setResult({ url: URL.createObjectURL(blob), name: `${base}-split.zip` });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not split this PDF.');
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
          <span className="truncate">{file.name} · {pageCount} page{pageCount !== 1 ? 's' : ''}</span>
          <button onClick={() => { setFile(null); setResult(null); }} className="text-xs font-medium text-workshop hover:underline">Remove</button>
        </div>
      )}

      {file && (
        <>
          <div className="flex gap-1 rounded-md border border-line bg-paper-dim p-1 text-xs font-medium">
            <button onClick={() => setMode('each')} className={`flex-1 rounded px-3 py-1.5 ${mode === 'each' ? 'bg-ink text-paper' : 'text-ink/60'}`}>
              Every page as its own file
            </button>
            <button onClick={() => setMode('range')} className={`flex-1 rounded px-3 py-1.5 ${mode === 'range' ? 'bg-ink text-paper' : 'text-ink/60'}`}>
              A page range
            </button>
          </div>
          {mode === 'range' && (
            <label className="block text-xs text-ink/60">
              Pages (e.g. 1-3, 5)
              <input value={range} onChange={(e) => setRange(e.target.value)} className="mt-1 block w-full rounded-md border border-line bg-paper px-3 py-2 text-sm" />
            </label>
          )}
          <Button onClick={split} disabled={busy}>{busy ? 'Splitting…' : 'Split PDF'}</Button>
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
