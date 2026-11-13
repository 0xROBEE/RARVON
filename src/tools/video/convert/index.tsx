import { useEffect, useRef, useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import DownloadButton from '../../../components/DownloadButton';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import { formatDuration } from '../../../lib/audioUtils';
import { formatBytes } from '../../../lib/imageUtils';
import { VideoCancelledError, probeVideo, runVideoConversion, checkFileSize, detectVideoCapabilities, videoCodecFor } from '../../../lib/videoEngine';
import type { VideoInfo, OutputContainer, VideoCapabilities } from '../../../lib/videoEngine';

export default function VideoConvertTool() {
  const [caps, setCaps] = useState<VideoCapabilities | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [target, setTarget] = useState<OutputContainer>('webm');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    detectVideoCapabilities().then(setCaps);
  }, []);

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
      setTarget(probed.sourceFormat === 'mp4' ? 'webm' : 'mp4');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open this video.');
    }
  }

  async function convert() {
    const controller = new AbortController();
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    abortRef.current = controller;
    try {
      const blob = await runVideoConversion(file, {
        container: target,
        forceVideoCodec: videoCodecFor(target),
        onProgress: setProgress,
        signal: controller.signal,
      });
      const base = file.name.replace(/\.[^.]+$/, '');
      setResult({ url: URL.createObjectURL(blob), name: `${base}.${target}` });
    } catch (e) {
      if (e instanceof VideoCancelledError) return;
      setError(e instanceof Error ? e.message : 'Could not convert this video.');
    } finally {
      setBusy(false);
    }
  }

  const targetSupported = caps && (target === 'mp4' ? caps.mp4H264 : caps.webmVp9);

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDropzone accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mkv,.mov" onFiles={handleFile} hint="MP4, MOV, WebM or MKV, up to 250MB" />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper-dim p-3 text-sm">
          <span className="truncate">
            {file.name} · {formatBytes(file.size)}
            {info && ` · ${info.sourceFormat.toUpperCase()} · ${formatDuration(info.durationSec)}`}
          </span>
          <button onClick={() => { setFile(null); setInfo(null); setResult(null); }} className="text-xs font-medium text-workshop hover:underline">Remove</button>
        </div>
      )}

      {info && (
        <>
          <div className="flex gap-1 rounded-md border border-line bg-paper-dim p-1 text-xs font-medium">
            {(['mp4', 'webm'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setTarget(c)}
                disabled={c === info.sourceFormat}
                className={`flex-1 rounded px-3 py-1.5 uppercase disabled:opacity-30 ${target === c ? 'bg-ink text-paper' : 'text-ink/60'}`}
              >
                {c}
              </button>
            ))}
          </div>
          {caps && !targetSupported && (
            <ErrorMessage>This browser can't encode {target === 'mp4' ? 'H.264' : 'VP9'} video, so converting to {target.toUpperCase()} isn't available here. Try a recent version of Chrome, Edge, or Firefox.</ErrorMessage>
          )}
          <Button onClick={convert} disabled={busy || !targetSupported}>{busy ? 'Converting…' : `Convert to ${target.toUpperCase()}`}</Button>
          {busy && <Button variant="secondary" onClick={() => abortRef.current?.abort()}>Cancel</Button>}
          {busy && <ProgressBar value={progress * 100} label="Converting" />}
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
