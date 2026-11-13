import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import DownloadButton from '../../../components/DownloadButton';
import ErrorMessage from '../../../components/ErrorMessage';
import { getPdfPageCount } from '../../../lib/pdfjs';

export default function DeletePdfPages() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
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
      setRange('');
    } catch {
      setError('Could not read this PDF.');
    }
  }

  function parseRange(input: string, max: number): Set<number> {
    const pages = new Set<number>();
    for (const part of input.split(',').map((p) => p.trim()).filter(Boolean)) {
      const m = part.match(/^(\d+)(?:-(\d+))?$/);
      if (!m) continue;
      const start = Number(m[1]);
      const end = m[2] ? Number(m[2]) : start;
      for (let p = start; p <= end; p++) if (p >= 1 && p <= max) pages.add(p);
    }
    return pages;
  }

  async function remove() {
    if (!file) return;
    const toRemove = parseRange(range, pageCount);
    if (!toRemove.size) {
      setError('Enter at least one valid page number to delete.');
      return;
    }
    if (toRemove.size >= pageCount) {
      setError('That would delete every page. Leave at least one page in the document.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const bytes = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(bytes);
      const keepIndices = srcDoc.getPageIndices().filter((i) => !toRemove.has(i + 1));
      const outDoc = await PDFDocument.create();
      const copied = await outDoc.copyPages(srcDoc, keepIndices);
      copied.forEach((p) => outDoc.addPage(p));
      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes as BlobPart], { type: 'application/pdf' });
      const base = file.name.replace(/\.pdf$/i, '');
      setResult({ url: URL.createObjectURL(blob), name: `${base}-pages-removed.pdf` });
    } catch {
      setError('Could not delete pages from this PDF.');
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
          <button onClick={() => { setFile(null); setResult(null); }} className="text-xs font-medium text-workshop hover:underline">Remove file</button>
        </div>
      )}

      {file && (
        <>
          <label className="block text-xs text-ink/60">
            Pages to delete (e.g. 2, 4-6)
            <input value={range} onChange={(e) => setRange(e.target.value)} placeholder="e.g. 2, 4-6" className="mt-1 block w-full rounded-md border border-line bg-paper px-3 py-2 text-sm" />
          </label>
          <Button onClick={remove} disabled={busy || !range.trim()}>{busy ? 'Deleting…' : 'Delete pages'}</Button>
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
