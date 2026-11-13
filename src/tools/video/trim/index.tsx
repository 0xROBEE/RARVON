import { useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import DownloadButton from '../../../components/DownloadButton';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import { formatDuration } from '../../../lib/audioUtils';
import { formatBytes } from '../../../lib/imageUtils';
import { probeVideo, runVideoConversion, checkFileSize } from '../../../lib/videoEngine';
import type { VideoInfo } from '../../../lib/videoEngine';

export default function TrimVideoTool() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);

  async function handleFile(files: File[]) {
    const f = files[0];
    setResult(null);
    setError(null);
    setInfo(null);

    const sizeError = checkFileSize(f);
    if (sizeError) {
      setError(sizeError);
      return;
    }

    try {
      const probed = await probeVideo(f);
      setFile(f);
      setInfo(probed);
      setStart(0);
      setEnd(probed.durationSec);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this video.');
    }
  }

  async function trim() {
    if (!file || !info || !info.container) return;
    if (end <= start) {
      setError('End time must be after the start time.');
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const blob = await runVideoConversion(file, {
        container: info.container,
        trim: { start, end },
        onProgress: setProgress,
      });
      const base = file.name.replace(/\.[^.]+$/, '');
      setResult({ url: URL.createObjectURL(blob), name: `${base}-trimmed.${info.container}` });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not trim this video.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDropzone accept="video/mp4,video/webm" onFiles={handleFile} hint="MP4 or WebM, up to 250MB" />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper-dim p-3 text-sm">
          <span className="truncate">
            {file.name} · {formatBytes(file.size)}
            {info && ` · ${info.width}×${info.height} · ${formatDuration(info.durationSec)}`}
          </span>
          <button onClick={() => { setFile(null); setInfo(null); setResult(null); }} className="text-xs font-medium text-workshop hover:underline">Remove</button>
        </div>
      )}

      {info && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-xs text-ink/60">
              Start ({formatDuration(start)})
              <input type="range" min={0} max={info.durationSec} step={0.1} value={start} onChange={(e) => setStart(Math.min(Number(e.target.value), end - 0.1))} className="mt-2 block w-full" />
            </label>
            <label className="text-xs text-ink/60">
              End ({formatDuration(end)})
              <input type="range" min={0} max={info.durationSec} step={0.1} value={end} onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 0.1))} className="mt-2 block w-full" />
            </label>
          </div>
          <p className="text-xs text-ink/50">Clip length: {formatDuration(end - start)}. This is designed to copy the existing video stream directly rather than re-encode it, which keeps quality intact when your browser can do that for this file.</p>
          <Button onClick={trim} disabled={busy}>{busy ? 'Trimming…' : 'Trim video'}</Button>
          {busy && <ProgressBar value={progress * 100} label="Processing" />}
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
