import { useEffect, useRef, useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import ErrorMessage from '../../../components/ErrorMessage';
import { formatDuration } from '../../../lib/audioUtils';
import { formatBytes } from '../../../lib/imageUtils';
import { VideoCancelledError, probeVideo, runVideoConversion, checkFileSize, detectVideoCapabilities, videoCodecFor } from '../../../lib/videoEngine';
import type { VideoInfo, OutputContainer, VideoCapabilities } from '../../../lib/videoEngine';
import { ActionBar, SizeDelta } from '../../../components/tool';
import { ConvertFlow, FormatPills, VideoThumb } from '../../../components/tool/ConvertFlow';
import { tr } from '../../../lib/i18n';

const VIDEO_HINTS: Record<string, string> = {
  mp4: 'Plays everywhere',
  webm: 'Smaller, for websites',
};

export default function VideoConvertTool() {
  const [caps, setCaps] = useState<VideoCapabilities | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [target, setTarget] = useState<OutputContainer>('webm');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  useEffect(() => () => { if (srcUrl) URL.revokeObjectURL(srcUrl); }, [srcUrl]);

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
      setSrcUrl(URL.createObjectURL(f));
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
      setResult({ url: URL.createObjectURL(blob), name: `${base}.${target}`, size: blob.size });
    } catch (e) {
      if (e instanceof VideoCancelledError) return;
      setError(e instanceof Error ? e.message : 'Could not convert this video.');
    } finally {
      setBusy(false);
    }
  }

  const targetSupported = caps && (target === 'mp4' ? caps.mp4H264 : caps.webmVp9);

  const base = file ? file.name.replace(/\.[^.]+$/, '') : '';
  const remove = () => { abortRef.current?.abort(); setFile(null); setInfo(null); setResult(null); setSrcUrl(null); };
  const formats = (['mp4', 'webm'] as const)
    .filter((c) => c !== info?.sourceFormat)
    .map((c) => ({ value: c, label: c.toUpperCase(), hint: VIDEO_HINTS[c] }));

  return (
    <div className="space-y-4">
      {!file && <FileDropzone accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mkv,.mov" onFiles={handleFile} hint={tr("MP4, MOV, WebM or MKV, up to 250MB")} />}

      {file && info && (
        <div className="slide-in space-y-4">
          <ConvertFlow
            from={{
              preview: srcUrl ? <VideoThumb url={srcUrl} /> : null,
              name: file.name,
              detail: `${formatBytes(file.size)} · ${formatDuration(info.durationSec)} · ${info.width}×${info.height}`,
              format: info.sourceFormat.toUpperCase(),
            }}
            to={{
              preview: srcUrl ? <VideoThumb url={srcUrl} /> : null,
              name: result?.name ?? `${base}.${target}`,
              detail: result
                ? <>{formatBytes(result.size)}<SizeDelta before={file.size} after={result.size} /></>
                : `${formatDuration(info.durationSec)} · ${info.width}×${info.height}`,
              format: target.toUpperCase(),
            }}
            state={busy ? 'busy' : result ? 'done' : 'idle'}
            progress={progress}
            onRemove={remove}
            result={result ? { url: result.url, filename: result.name } : undefined}
          />

          <div className="grid gap-3 rounded-xl border border-line bg-elevated p-3 sm:p-4">
            <p className="text-xs font-medium text-ink-2">{tr("Convert to")}</p>
            <FormatPills options={formats} value={target} onChange={(c) => { setTarget(c); setResult(null); }} disabled={busy} />
            {caps && !targetSupported && (
              <ErrorMessage>{tr("This browser can't encode")}{' '}{target === 'mp4' ? 'H.264' : tr("VP9")}{' '}{tr("video, so converting to")}{' '}{target.toUpperCase()}{' '}{tr("isn't available here. Try a recent version of Chrome, Edge, or Firefox.")}</ErrorMessage>
            )}
          </div>

          <ActionBar>
            {busy && <Button variant="secondary" onClick={() => abortRef.current?.abort()} className="sm:ms-auto">{tr("Cancel")}</Button>}
            <Button onClick={convert} disabled={busy || !targetSupported} className={busy ? undefined : 'sm:ms-auto'}>
              {busy ? tr("Converting…") : tr("Convert to {0}", { 0: target.toUpperCase() })}
            </Button>
          </ActionBar>
        </div>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
}
