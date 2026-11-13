import { useEffect, useRef, useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import DownloadButton from '../../../components/DownloadButton';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import { formatDuration } from '../../../lib/audioUtils';
import { formatBytes } from '../../../lib/imageUtils';
import { AUDIO_TARGETS, CancelledError, convertAudio, encodableAudioTargets, probeAudio } from '../../../lib/audioEngine';
import type { AudioInfo, AudioTarget } from '../../../lib/audioEngine';
import { extractAudioFromVideo } from '../../../lib/videoAudioCapture';

const supportsCaptureStream =
  typeof HTMLVideoElement !== 'undefined' &&
  ('captureStream' in HTMLVideoElement.prototype || 'mozCaptureStream' in HTMLVideoElement.prototype);

type Choice = AudioTarget | 'original';

export default function ExtractAudioTool() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<AudioInfo | null>(null);
  /** True when the container can't be read directly and the real-time capture fallback is used. */
  const [useCapture, setUseCapture] = useState(false);
  const [targets, setTargets] = useState<Set<AudioTarget>>(new Set(['wav']));
  const [choice, setChoice] = useState<Choice>('original');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size: number; note?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void encodableAudioTargets().then(setTargets);
  }, []);

  function reset() {
    abortRef.current?.abort();
    setFile(null);
    setInfo(null);
    setUseCapture(false);
    setResult(null);
    setError(null);
  }

  async function handleFile(files: File[]) {
    const f = files[0];
    reset();
    try {
      setInfo(await probeAudio(f));
      setFile(f);
    } catch (e) {
      if (e instanceof Error && e.message.includes('no audio')) {
        setError('This video has no audio track to extract.');
      } else if (supportsCaptureStream) {
        setUseCapture(true);
        setFile(f);
      } else {
        setError('This video format can’t be read in this browser. MP4, MOV, WebM and MKV work best.');
      }
    }
  }

  async function extract() {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress(0);
    const base = file.name.replace(/\.[^.]+$/, '');
    try {
      if (useCapture) {
        const blob = await extractAudioFromVideo(file, setProgress);
        const ext = blob.type.includes('ogg') ? 'ogg' : 'webm';
        setResult({ url: URL.createObjectURL(blob), name: `${base}-audio.${ext}`, size: blob.size });
      } else {
        const out = await convertAudio(file, { target: choice, bitrate: 160_000, onProgress: setProgress, signal: controller.signal });
        setResult({
          url: URL.createObjectURL(out.blob),
          name: `${base}-audio.${out.extension}`,
          size: out.blob.size,
          note: out.copied ? 'Copied without re-encoding — identical to the audio in the video.' : undefined,
        });
      }
    } catch (e) {
      if (e instanceof CancelledError) return;
      setError(e instanceof Error ? e.message : 'Could not extract audio from this video.');
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  const options: { value: Choice; label: string }[] = [
    { value: 'original', label: 'Original audio — no re-encoding, instant, best quality' },
    ...AUDIO_TARGETS.filter((t) => targets.has(t.value)).map((t) => ({ value: t.value as Choice, label: t.label })),
  ];

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDropzone accept="video/*,.mkv,.mov" onFiles={handleFile} hint="MP4, MOV, WebM, MKV or any video your browser can play" />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper-dim p-3 text-sm">
          <span className="truncate">{file.name} · {formatBytes(file.size)}{info && ` · ${formatDuration(info.durationSec)} · ${info.codec?.toUpperCase() ?? 'audio'}`}</span>
          <button onClick={reset} className="text-xs font-medium text-workshop hover:underline">Remove</button>
        </div>
      )}

      {file && !useCapture && (
        <fieldset className="space-y-1.5" disabled={busy}>
          <legend className="mb-1 text-xs font-medium text-ink/60">Save as</legend>
          {options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <input type="radio" name="extract-format" checked={choice === o.value} onChange={() => setChoice(o.value)} />
              {o.label}
            </label>
          ))}
        </fieldset>
      )}
      {file && useCapture && (
        <p className="text-xs text-ink/50">
          This video’s format can’t be read directly, so its audio is captured while it plays in the background — this takes about as
          long as the video itself.
        </p>
      )}
      {file && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={extract} disabled={busy}>{busy ? 'Extracting…' : 'Extract audio'}</Button>
            {busy && !useCapture && <Button variant="secondary" onClick={() => abortRef.current?.abort()}>Cancel</Button>}
          </div>
          {busy && <ProgressBar value={progress * 100} label={useCapture ? 'Capturing audio' : `Extracting… ${Math.round(progress * 100)}%`} />}
        </>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {result && (
        <div className="space-y-1 rounded-md border border-line bg-paper-dim p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm">{result.name} · {formatBytes(result.size)}</span>
            <DownloadButton url={result.url} filename={result.name} />
          </div>
          {result.note && <p className="text-xs text-ink/50">{result.note}</p>}
        </div>
      )}
    </div>
  );
}
