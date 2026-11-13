import { useEffect, useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import ErrorMessage from '../../../components/ErrorMessage';
import FormatBadge from '../../../components/FormatBadge';
import { canvasToBlob, formatBytes } from '../../../lib/imageUtils';
import {
  getSupportedEncodeFormats,
  tryDecodeImage,
  isSvg,
  guessSvgDimensions,
} from '../../../lib/imageFormatSupport';
import type { ImageFormatOption } from '../../../lib/imageFormatSupport';
import { ResultCard, ActionBar } from '../../../components/tool';

const INPUT_LABELS: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/avif': 'AVIF',
  'image/gif': 'GIF',
  'image/bmp': 'BMP',
  'image/x-icon': 'ICO',
  'image/vnd.microsoft.icon': 'ICO',
  'image/tiff': 'TIFF',
  'image/heic': 'HEIC',
  'image/heif': 'HEIF',
  'image/svg+xml': 'SVG',
};
const EXTENSION_LABELS: Record<string, string> = {
  jpg: 'JPEG', jpeg: 'JPEG', png: 'PNG', webp: 'WebP', avif: 'AVIF', gif: 'GIF',
  bmp: 'BMP', ico: 'ICO', tif: 'TIFF', tiff: 'TIFF', heic: 'HEIC', heif: 'HEIF', svg: 'SVG',
};

function detectLabel(file: File): string {
  if (INPUT_LABELS[file.type]) return INPUT_LABELS[file.type];
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_LABELS[ext] ?? (file.type || ext.toUpperCase() || 'Unknown');
}

function decodeFailureMessage(file: File): string {
  const label = detectLabel(file).toLowerCase();
  if (label.includes('heic') || label.includes('heif')) {
    return 'This browser can\u2019t open HEIC/HEIF photos. Safari can display many HEIC files directly; Chrome and Firefox generally can\u2019t decode HEIC at all. Try exporting to JPEG from your device\u2019s Photos app first.';
  }
  if (label.includes('tiff')) {
    return 'Most browsers can\u2019t open TIFF files directly. Try converting it with your OS\u2019s image viewer or Preview app first.';
  }
  return 'This browser couldn\u2019t open this image. It may be corrupted or use a format this browser can\u2019t decode.';
}

interface Decoded {
  file: File;
  label: string;
  previewUrl: string;
  width: number;
  height: number;
  isSvgInput: boolean;
  isAnimatedGif: boolean;
}

export default function ImageConvert() {
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [target, setTarget] = useState<ImageFormatOption | null>(null);
  const [quality, setQuality] = useState(0.92);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const encodeFormats = getSupportedEncodeFormats();
  const outputOptions = decoded ? encodeFormats.filter((f) => f.mime !== decoded.file.type) : encodeFormats;

  useEffect(() => {
    if (outputOptions.length && (!target || !outputOptions.some((o) => o.mime === target.mime))) {
      setTarget(outputOptions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decoded]);

  async function handleFile(files: File[]) {
    const file = files[0];
    setResult(null);
    setConvertError(null);
    setDecodeError(null);
    setDecoded(null);

    const label = detectLabel(file);
    const svgInput = isSvg(file);

    try {
      if (svgInput) {
        const { width, height } = await guessSvgDimensions(file);
        setDecoded({ file, label, previewUrl: URL.createObjectURL(file), width, height, isSvgInput: true, isAnimatedGif: false });
      } else {
        const { image, url } = await tryDecodeImage(file);
        setDecoded({
          file,
          label,
          previewUrl: url,
          width: image.naturalWidth,
          height: image.naturalHeight,
          isSvgInput: false,
          isAnimatedGif: file.type === 'image/gif',
        });
      }
    } catch {
      setDecodeError(decodeFailureMessage(file));
    }
  }

  async function convert() {
    if (!decoded || !target) return;
    setBusy(true);
    setConvertError(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = decoded.width;
      canvas.height = decoded.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not supported in this browser.');

      const img = new Image();
      const loaded = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Could not re-read this image for conversion.'));
      });
      img.src = decoded.previewUrl;
      await loaded;

      if (target.mime === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const supportsQuality = target.mime === 'image/jpeg' || target.mime === 'image/webp' || target.mime === 'image/avif';
      const blob = await canvasToBlob(canvas, target.mime, supportsQuality ? quality : undefined);
      const base = decoded.file.name.replace(/\.[^.]+$/, '');
      setResult({ url: URL.createObjectURL(blob), name: `${base}.${target.extension}`, size: blob.size });
    } catch (e) {
      setConvertError(e instanceof Error ? e.message : 'Could not convert this image.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!decoded && !decodeError && (
        <FileDropzone
          accept="image/*,.heic,.heif,.tif,.tiff,.ico"
          onFiles={handleFile}
          hint="JPG, PNG, WebP, GIF, BMP, ICO, SVG — plus AVIF, TIFF or HEIC where your browser supports opening them"
        />
      )}

      {decodeError && (
        <div className="space-y-3">
          <ErrorMessage>{decodeError}</ErrorMessage>
          <Button variant="secondary" onClick={() => setDecodeError(null)}>Try a different file</Button>
        </div>
      )}

      {decoded && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper-dim p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm">{decoded.file.name} · {formatBytes(decoded.file.size)}</span>
              <FormatBadge label={decoded.label} />
            </div>
            <button
              onClick={() => { setDecoded(null); setResult(null); }}
              className="text-xs font-medium text-workshop hover:underline"
            >
              Remove
            </button>
          </div>

          {decoded.isAnimatedGif && (
            <p className="text-xs text-ink-3">If this GIF is animated, only its first frame will be converted — canvas-based conversion can't preserve animation.</p>
          )}

          {decoded.isSvgInput && (
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-ink-2">
                Output width
                <input
                  type="number" min={1} value={decoded.width}
                  onChange={(e) => setDecoded((d) => (d ? { ...d, width: Math.max(1, Number(e.target.value)) } : d))}
                  className="mt-1 block w-24 rounded-md border border-line bg-paper px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-ink-2">
                Output height
                <input
                  type="number" min={1} value={decoded.height}
                  onChange={(e) => setDecoded((d) => (d ? { ...d, height: Math.max(1, Number(e.target.value)) } : d))}
                  className="mt-1 block w-24 rounded-md border border-line bg-paper px-2 py-1.5 text-sm"
                />
              </label>
              <p className="pb-2 text-xs text-ink-3">SVG has no fixed pixel size — pick the resolution to render at.</p>
            </div>
          )}

          {outputOptions.length === 0 ? (
            <ErrorMessage>This browser doesn't support encoding to any image format from this tool. Try a recent version of Chrome, Firefox, Edge or Safari.</ErrorMessage>
          ) : (
            <>
              <label className="flex items-center gap-2 text-xs text-ink-2">
                Convert to
                <select
                  value={target?.mime ?? ''}
                  onChange={(e) => setTarget(outputOptions.find((o) => o.mime === e.target.value) ?? null)}
                  className="rounded-md border border-line bg-paper px-2 py-1.5 text-xs"
                >
                  {outputOptions.map((f) => (
                    <option key={f.mime} value={f.mime}>{f.label}</option>
                  ))}
                </select>
              </label>

              {(target?.mime === 'image/jpeg' || target?.mime === 'image/webp' || target?.mime === 'image/avif') && (
                <label className="flex items-center gap-3 text-xs text-ink-2">
                  Quality
                  <input type="range" min={0.3} max={1} step={0.05} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="flex-1 max-w-xs" />
                  {Math.round(quality * 100)}%
                </label>
              )}

              <ActionBar><Button onClick={convert} disabled={busy || !target}>{busy ? 'Converting…' : 'Convert'}</Button></ActionBar>
            </>
          )}
        </>
      )}

      {convertError && <ErrorMessage>{convertError}</ErrorMessage>}
      {result && (
        <ResultCard url={result.url} filename={result.name}>{result.name} · {formatBytes(result.size)}</ResultCard>
      )}
    </div>
  );
}
