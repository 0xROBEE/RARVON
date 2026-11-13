import { useRef, useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import DownloadButton from '../../../components/DownloadButton';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import { formatDuration } from '../../../lib/audioUtils';
import { formatBytes } from '../../../lib/imageUtils';
import { probeVideo, runVideoConversion, checkFileSize, compressionBitrates, VideoCancelledError } from '../../../lib/videoEngine';
import type { VideoInfo } from '../../../lib/videoEngine';

type Level = 'high' | 'medium' | 'low';
const LEVELS: { value: Level; label: string; hint: string }[] = [
  { value: 'high', label: 'Light', hint: 'about 30% smaller, quality nearly unchanged' },
  { value: 'medium', label: 'Balanced', hint: 'about half the size' },
  { value: 'low', label: 'Strong', hint: 'smallest file, visible quality loss' },
];
const MAX_HEIGHTS = [0, 1080, 720, 480, 360, 240];

function even(n: number) {
  return Math.max(2, Math.round(n / 2) * 2);
}

export default function VideoCompressTool() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [level, setLevel] = useState<Level>('medium');
  const [maxHeight, setMaxHeight] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      setMaxHeight(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this video.');
    }
  }

  const shortSide = info ? Math.min(info.width, info.height) : 0;
  const resize = info && maxHeight && shortSide > maxHeight
    ? (() => {
      const s = maxHeight / shortSide;
      return { width: even(info.width * s), height: even(info.height * s) };
    })()
    : undefined;
  const rates = info ? compressionBitrates(info, level, resize ? resize.width * resize.height : undefined) : null;
  const estimate = info && rates ? ((rates.video + (rates.audio ?? 0)) * info.durationSec) / 8 : 0;

  async function compress() {
    if (!file || !info || !info.container || !rates) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress(0);
    try {
      const blob = await runVideoConversion(file, {
        container: info.container,
        videoBitrate: rates.video,
        audioBitrate: rates.audio,
        resize,
        onProgress: setProgress,
        signal: controller.signal,
      });
      const base = file.name.replace(/\.[^.]+$/, '');
      setResult({ url: URL.createObjectURL(blob), name: `${base}-compressed.${info.container}`, size: blob.size });
    } catch (e) {
      if (e instanceof VideoCancelledError) return;
      setError(e instanceof Error ? e.message : 'Could not compress this video.');
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDropzone accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mkv,.mov" onFiles={handleFile} hint="MP4, MOV, WebM or MKV, up to 250MB" />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper-dim p-3 text-sm">
          <span className="truncate">
            {file.name} · {formatBytes(file.size)}
            {info && ` · ${info.width}×${info.height} · ${formatDuration(info.durationSec)}`}
          </span>
          <button onClick={() => { abortRef.current?.abort(); setFile(null); setInfo(null); setResult(null); }} className="text-xs font-medium text-workshop hover:underline">Remove</button>
        </div>
      )}

      {info && (
        <>
          <fieldset className="space-y-1.5" disabled={busy}>
            <legend className="mb-1 text-xs font-medium text-ink/60">Compression</legend>
            {LEVELS.map((l) => (
              <label key={l.value} className="flex items-center gap-2 text-sm">
                <input type="radio" name="video-quality" checked={level === l.value} onChange={() => setLevel(l.value)} />
                {l.label} <span className="text-xs text-ink/50">— {l.hint}</span>
              </label>
            ))}
          </fieldset>
          <label className="flex flex-wrap items-center gap-2 text-xs text-ink/60">
            Maximum resolution
            <select value={maxHeight} disabled={busy} onChange={(e) => setMaxHeight(Number(e.target.value))} className="rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink">
              {MAX_HEIGHTS.filter((h) => h === 0 || h < shortSide).map((h) => (
                <option key={h} value={h}>{h === 0 ? `Keep ${info.width}×${info.height}` : `${h}p`}</option>
              ))}
            </select>
            {resize && <span>→ {resize.width}×{resize.height}</span>}
          </label>
          <p className="text-xs text-ink/50">
            Estimated result: about {formatBytes(estimate)} (now {formatBytes(file!.size)}). Re-encoding uses your device’s video
            encoder and takes a while for long videos.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={compress} disabled={busy}>{busy ? 'Compressing…' : 'Compress video'}</Button>
            {busy && <Button variant="secondary" onClick={() => abortRef.current?.abort()}>Cancel</Button>}
          </div>
          {busy && <ProgressBar value={progress * 100} label={`Re-encoding… ${Math.round(progress * 100)}%`} />}
        </>
      )}

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
            This video is already efficiently compressed — the re-encoded file came out {formatBytes(result.size)}, not smaller than the
            original {formatBytes(file.size)}. Keep your original, or try “Strong” compression or a lower maximum resolution.
          </ErrorMessage>
        )
      )}
    </div>
  );
}
