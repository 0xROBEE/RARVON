import { useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import DownloadButton from '../../../components/DownloadButton';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import { extractAudioFromVideo } from '../../../lib/videoAudioCapture';

const supportsCaptureStream =
  typeof HTMLVideoElement !== 'undefined' &&
  ('captureStream' in HTMLVideoElement.prototype || 'mozCaptureStream' in HTMLVideoElement.prototype);

export default function ExtractAudioTool() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);

  function handleFile(files: File[]) {
    setFile(files[0]);
    setResult(null);
    setError(null);
    setProgress(0);
  }

  async function extract() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const blob = await extractAudioFromVideo(file, setProgress);
      const base = file.name.replace(/\.[^.]+$/, '');
      const ext = blob.type.includes('ogg') ? 'ogg' : 'webm';
      setResult({ url: URL.createObjectURL(blob), name: `${base}-audio.${ext}` });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not extract audio from this video.');
    } finally {
      setBusy(false);
    }
  }

  if (!supportsCaptureStream) {
    return <ErrorMessage>This browser doesn't support capturing a video's audio track. Try a recent version of Chrome, Edge or Firefox.</ErrorMessage>;
  }

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDropzone accept="video/*" onFiles={handleFile} hint="Any video your browser can play" />
      ) : (
        <div className="flex items-center justify-between rounded-md border border-line bg-paper-dim p-3 text-sm">
          <span className="truncate">{file.name}</span>
          <button onClick={() => { setFile(null); setResult(null); }} className="text-xs font-medium text-workshop hover:underline">Remove</button>
        </div>
      )}

      {file && (
        <>
          <p className="text-xs text-ink/50">This plays the video in the background to capture its audio track, so it takes about as long as the video itself.</p>
          <Button onClick={extract} disabled={busy}>{busy ? 'Extracting…' : 'Extract audio'}</Button>
          {busy && <ProgressBar value={progress * 100} label="Capturing audio" />}
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
