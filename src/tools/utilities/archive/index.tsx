import { useState } from 'react';
import JSZip from 'jszip';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import { formatBytes } from '../../../lib/imageUtils';
import { ResultCard, ActionBar } from '../../../components/tool';

interface Entry {
  id: string;
  file: File;
  name: string;
}

type Level = 'none' | 'fast' | 'balanced' | 'best';
const LEVELS: { value: Level; label: string; numeric: number | null }[] = [
  { value: 'none', label: 'None (store only, fastest)', numeric: null },
  { value: 'fast', label: 'Fast', numeric: 1 },
  { value: 'balanced', label: 'Balanced', numeric: 6 },
  { value: 'best', label: 'Best (slowest)', numeric: 9 },
];

function dedupeName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let i = 1;
  let candidate = `${base} (${i})${ext}`;
  while (taken.has(candidate)) {
    i++;
    candidate = `${base} (${i})${ext}`;
  }
  return candidate;
}

export default function ArchiveTool() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [archiveName, setArchiveName] = useState('archive.zip');
  const [level, setLevel] = useState<Level>('balanced');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);

  function addFiles(files: File[]) {
    setResult(null);
    setError(null);
    setEntries((prev) => [
      ...prev,
      ...files.map((file) => ({ id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`, file, name: file.name })),
    ]);
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function renameEntry(id: string, name: string) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, name } : e)));
  }

  const totalInputSize = entries.reduce((sum, e) => sum + e.file.size, 0);

  async function createZip() {
    if (!entries.length) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const zip = new JSZip();
      const taken = new Set<string>();
      const levelDef = LEVELS.find((l) => l.value === level)!;

      for (const entry of entries) {
        const finalName = dedupeName(entry.name.trim() || entry.file.name, taken);
        taken.add(finalName);
        if (levelDef.numeric === null) {
          zip.file(finalName, entry.file, { compression: 'STORE' });
        } else {
          zip.file(finalName, entry.file, { compression: 'DEFLATE', compressionOptions: { level: levelDef.numeric } });
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' }, (meta) => setProgress(meta.percent));
      const name = archiveName.trim() || 'archive.zip';
      setResult({ url: URL.createObjectURL(blob), name: name.endsWith('.zip') ? name : `${name}.zip`, size: blob.size });
    } catch {
      setError('Could not build the archive. One of the files may be unreadable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <FileDropzone multiple onFiles={addFiles} label="Drop files here, or click to browse" hint="Any file type, any number of files" />

      {entries.length > 0 && (
        <>
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center gap-2 rounded-md border border-line bg-paper-dim p-2.5 text-sm">
                <input
                  value={e.name}
                  onChange={(ev) => renameEntry(e.id, ev.target.value)}
                  className="min-w-0 flex-1 rounded border border-line bg-paper px-2 py-1 text-sm"
                  aria-label={`Name for ${e.file.name}`}
                />
                <span className="shrink-0 text-xs text-ink-3">{formatBytes(e.file.size)}</span>
                <button onClick={() => removeEntry(e.id)} className="shrink-0 rounded px-1.5 py-1 text-xs text-warn hover:bg-paper" aria-label={`Remove ${e.file.name}`}>
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <p className="text-xs text-ink-3">
            {entries.length} file{entries.length !== 1 ? 's' : ''} · {formatBytes(totalInputSize)} total before archiving
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-ink-2">
              Archive name
              <input value={archiveName} onChange={(e) => setArchiveName(e.target.value)} className="mt-1 block w-48 rounded-md border border-line bg-paper px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs text-ink-2">
              Compression
              <select value={level} onChange={(e) => setLevel(e.target.value as Level)} className="mt-1 block rounded-md border border-line bg-paper px-2 py-1.5 text-sm">
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </label>
          </div>

          <p className="text-xs text-ink-3">
            Already-compressed files (JPG, MP4, another ZIP) won't shrink much no matter the level — ZIP can't
            compress what's already compressed.
          </p>

          <ActionBar><Button onClick={createZip} disabled={busy}>{busy ? 'Building archive…' : 'Create ZIP'}</Button></ActionBar>
          {busy && <ProgressBar value={progress} label="Compressing files" />}
        </>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {result && (
        <ResultCard url={result.url} filename={result.name}>{result.name} · {formatBytes(result.size)}
            {totalInputSize > 0 && (
              <span className="ml-1 text-ink-3">
                ({result.size < totalInputSize ? `-${Math.round((1 - result.size / totalInputSize) * 100)}%` : 'no smaller than the originals combined'})
              </span>
            )}</ResultCard>
      )}
    </div>
  );
}
