import { useEffect, useRef, useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import DownloadButton from '../../../components/DownloadButton';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import FormatBadge from '../../../components/FormatBadge';
import { audioBufferToWavBlob, decodeAudioFile, formatDuration } from '../../../lib/audioUtils';
import { formatBytes } from '../../../lib/imageUtils';
import { AUDIO_TARGETS, CancelledError, convertAudio, encodableAudioTargets, probeAudio } from '../../../lib/audioEngine';
import type { AudioInfo, AudioTarget } from '../../../lib/audioEngine';

const CODEC_LABELS: Record<string, string> = {
  aac: 'AAC', opus: 'Opus', mp3: 'MP3', vorbis: 'Vorbis', flac: 'FLAC', alac: 'ALAC',
  'pcm-s16': 'WAV', 'pcm-s24': 'WAV', 'pcm-s32': 'WAV', 'pcm-f32': 'WAV', 'pcm-u8': 'WAV',
};

export default function AudioConvertTool() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<AudioInfo | null>(null);
  /** Files the engine can't demux but the browser can decode: WAV output only. */
  const [fallback, setFallback] = useState<AudioBuffer | null>(null);
  const [targets, setTargets] = useState<Set<AudioTarget>>(new Set(['wav']));
  const [target, setTarget] = useState<AudioTarget>('wav');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void encodableAudioTargets().then((t) => {
      setTargets(t);
      setTarget(t.has('mp3') ? 'mp3' : t.has('aac') ? 'aac' : t.has('opus') ? 'opus' : 'wav');
    });
  }, []);

  function reset() {
    abortRef.current?.abort();
    setFile(null);
    setInfo(null);
    setFallback(null);
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
      try {
        setFallback(await decodeAudioFile(f));
        setFile(f);
      } catch {
        setError(e instanceof Error && e.message.includes('no audio') ? e.message : 'Could not read this audio file. Try MP3, WAV, OGG, FLAC or M4A.');
      }
    }
  }

  async function convert() {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress(0);
    const base = file.name.replace(/\.[^.]+$/, '');
    try {
      if (fallback) {
        const blob = audioBufferToWavBlob(fallback);
        setResult({ url: URL.createObjectURL(blob), name: `${base}.wav`, size: blob.size });
      } else {
        const out = await convertAudio(file, { target, bitrate: 160_000, onProgress: setProgress, signal: controller.signal });
        setResult({ url: URL.createObjectURL(out.blob), name: `${base}.${out.extension}`, size: out.blob.size });
      }
    } catch (e) {
      if (e instanceof CancelledError) return;
      setError(e instanceof Error ? e.message : 'Could not convert this audio file.');
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  const duration = info?.durationSec ?? fallback?.duration ?? 0;
  const sourceLabel = info?.codec ? CODEC_LABELS[info.codec] ?? info.codec.toUpperCase() : file?.name.split('.').pop()?.toUpperCase() ?? '';
  const options = fallback ? AUDIO_TARGETS.filter((t) => t.value === 'wav') : AUDIO_TARGETS.filter((t) => targets.has(t.value));

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDropzone accept="audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav,.aac" onFiles={handleFile} hint="MP3, WAV, OGG, FLAC, M4A or Opus" />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper-dim p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate">{file.name} · {formatBytes(file.size)} · {formatDuration(duration)}</span>
            {sourceLabel && <FormatBadge label={sourceLabel} />}
          </div>
          <button onClick={reset} className="text-xs font-medium text-workshop hover:underline">Remove</button>
        </div>
      )}

      {file && (
        <>
          <fieldset className="space-y-1.5" disabled={busy}>
            <legend className="mb-1 text-xs font-medium text-ink/60">Convert to</legend>
            {options.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm">
                <input type="radio" name="audio-target" checked={(fallback ? 'wav' : target) === o.value} onChange={() => setTarget(o.value)} />
                {o.label}
              </label>
            ))}
          </fieldset>
          {fallback && <p className="text-xs text-ink/50">This file can be decoded but not re-packaged by the converter, so only WAV output is available for it.</p>}
          {target === 'mp3' && !fallback && (
            <p className="text-xs text-ink/50">The first MP3 export downloads the MP3 encoder once (about 120 KB compressed); it runs on your device like everything else.</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={convert} disabled={busy}>{busy ? 'Converting…' : 'Convert'}</Button>
            {busy && <Button variant="secondary" onClick={() => abortRef.current?.abort()}>Cancel</Button>}
          </div>
          {busy && <ProgressBar value={progress * 100} label={`Converting… ${Math.round(progress * 100)}%`} />}
        </>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {result && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper-dim p-3">
          <span className="text-sm">{result.name} · {formatBytes(result.size)}</span>
          <DownloadButton url={result.url} filename={result.name} />
        </div>
      )}
    </div>
  );
}
