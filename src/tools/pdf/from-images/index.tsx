import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import ErrorMessage from '../../../components/ErrorMessage';
import { formatBytes } from '../../../lib/imageUtils';
import { ResultCard, ActionBar } from '../../../components/tool';

export default function FromImages() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);

  function addFiles(newFiles: File[]) {
    setFiles((f) => [...f, ...newFiles.filter((n) => n.type === 'image/jpeg' || n.type === 'image/png')]);
    setResult(null);
  }

  function move(index: number, dir: -1 | 1) {
    setFiles((f) => {
      const next = [...f];
      const target = index + dir;
      if (target < 0 || target >= next.length) return f;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(index: number) {
    setFiles((f) => f.filter((_, i) => i !== index));
  }

  async function build() {
    if (!files.length) return;
    setBusy(true);
    setError(null);
    try {
      const doc = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const image = file.type === 'image/png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const page = doc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      }
      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: 'application/pdf' });
      setResult({ url: URL.createObjectURL(blob), name: 'images.pdf' });
    } catch {
      setError('Could not build a PDF from these images. Only JPG and PNG are supported.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <FileDropzone accept="image/jpeg,image/png" multiple onFiles={addFiles} hint="JPG or PNG, one page per image" />

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-md border border-line bg-paper-dim p-2.5 text-sm">
              <span className="truncate">{i + 1}. {f.name} · {formatBytes(f.size)}</span>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-1.5 py-1 text-xs hover:bg-paper disabled:opacity-30" aria-label="Move up">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === files.length - 1} className="rounded px-1.5 py-1 text-xs hover:bg-paper disabled:opacity-30" aria-label="Move down">↓</button>
                <button onClick={() => remove(i)} className="rounded px-1.5 py-1 text-xs text-warn hover:bg-paper" aria-label="Remove">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ActionBar><Button onClick={build} disabled={!files.length || busy}>{busy ? 'Building…' : 'Create PDF'}</Button></ActionBar>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {result && (
        <ResultCard url={result.url} filename={result.name}>{result.name}</ResultCard>
      )}
    </div>
  );
}
