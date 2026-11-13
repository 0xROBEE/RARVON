import { useEffect, useRef, useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import { formatDuration } from '../../../lib/audioUtils';
import { formatBytes } from '../../../lib/imageUtils';
import { CancelledError, convertAudio, encodableAudioTargets, probeAudio } from '../../../lib/audioEngine';
import type { AudioInfo, AudioTarget } from '../../../lib/audioEngine';
import { ActionBar, OptionCards, ResultCard, SizeDelta } from '../../../components/tool';

const PRESETS = [
  { bitrate: 128_000, label: 'High', hint: '128 kb/s — music, near-transparent' },
  { bitrate: 96_000, label: 'Balanced', hint: '96 kb/s — music and podcasts' },
  { bitrate: 64_000, label: 'Small', hint: '64 kb/s — speech, voice notes' },
  { bitrate: 32_000, label: 'Smallest', hint: '32 kb/s — speech only' },
];

export default function AudioCompressTool() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<AudioInfo | null>(null);
  const [bitrate, setBitrate] = useState(96_000);
  const [codecs, setCodecs] = useState<AudioTarget[]>([]);
  const [codec, setCodec] = useState<AudioTarget>('opus');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void encodableAudioTargets().then((t) => {
      const lossy = (['opus', 'aac', 'mp3'] as const).filter((c) => t.has(c));
      setCodecs(lossy);
      if (lossy.length) setCodec(lossy[0]);
    });
  }, []);

  function reset() {
    abortRef.current?.abort();
    setFile(null);
    setInfo(null);
    setResult(null);
    setError(null);
  }

  async function handleFile(files: File[]) {
    const f = files[0];
    reset();
    try {
      const probed = await probeAudio(f);
      setInfo(probed);
      setFile(f);
    } catch (e) {
      setError(e instanceof Error && e.message.includes('no audio') ? e.message : 'Could not read this audio file. Try MP3, WAV, OGG, FLAC or M4A.');
    }
  }

  async function compress() {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress(0);
    try {
      const out = await convertAudio(file, { target: codec, bitrate, onProgress: setProgress, signal: controller.signal });
      const base = file.name.replace(/\.[^.]+$/, '');
      setResult({ url: URL.createObjectURL(out.blob), name: `${base}-compressed.${out.extension}`, size: out.blob.size });
    } catch (e) {
      if (e instanceof CancelledError) return;
      setError(e instanceof Error ? e.message : 'Could not compress this audio file.');
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  const estimate = info ? (bitrate * info.durationSec) / 8 : 0;

  if (!codecs.length && file) {
    return <ErrorMessage>This browser can’t encode compressed audio (Opus or AAC). Try a recent version of Chrome, Edge, Firefox or Safari.</ErrorMessage>;
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDropzone accept="audio/*,.mp3,.m4a,.flac,.ogg,.opus,.wav,.aac" onFiles={handleFile} hint="MP3, WAV, OGG, FLAC, M4A or Opus" />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper-dim p-3 text-sm">
          <span className="truncate">{file.name} · {formatBytes(file.size)}{info && ` · ${formatDuration(info.durationSec)} · ~${Math.round(info.bitrate / 1000)} kb/s`}</span>
          <button onClick={reset} className="text-xs font-medium text-workshop hover:underline">Remove</button>
        </div>
      )}

      {info && (
        <>
          <OptionCards legend="Quality" name="bitrate" disabled={busy} value={bitrate} onChange={setBitrate} options={PRESETS.map((p) => ({ value: p.bitrate, label: p.label, hint: p.hint }))} />
          {codecs.length > 1 && (
            <label className="flex items-center gap-2 text-xs text-ink-2">
              Format
              <select value={codec} disabled={busy} onChange={(e) => setCodec(e.target.value as AudioTarget)} className="rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink">
                {codecs.includes('opus') && <option value="opus">Opus (.ogg) — best quality for its size</option>}
                {codecs.includes('aac') && <option value="aac">AAC (.m4a) — plays everywhere</option>}
                {codecs.includes('mp3') && <option value="mp3">MP3 — the most compatible</option>}
              </select>
            </label>
          )}
          <p className="text-xs text-ink-3">Estimated result: about {formatBytes(estimate)} (now {formatBytes(file!.size)}).</p>
          <ActionBar>
            <Button onClick={compress} disabled={busy}>{busy ? 'Compressing…' : 'Compress'}</Button>
            {busy && <Button variant="secondary" onClick={() => abortRef.current?.abort()}>Cancel</Button>}
          </ActionBar>
          {busy && <ProgressBar value={progress * 100} label={`Encoding… ${Math.round(progress * 100)}%`} />}
        </>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {result && file && (
        result.size < file.size ? (
          <ResultCard url={result.url} filename={result.name}>
            {result.name} · {formatBytes(result.size)}
            <SizeDelta before={file.size} after={result.size} />
          </ResultCard>
        ) : (
          <ErrorMessage>
            This file is already smaller than that quality setting ({formatBytes(result.size)} vs. {formatBytes(file.size)}), so keep your
            original or pick a lower quality.
          </ErrorMessage>
        )
      )}
    </div>
  );
}
