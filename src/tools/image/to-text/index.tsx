import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import { formatBytes } from '../../../lib/imageUtils';
import { OCR_LANGUAGES, recognizeText, terminateOcr } from '../../../lib/ocrEngine';
import type { OcrLayout, OcrProgress } from '../../../lib/ocrEngine';
import { decodeImage, preprocessForOcr } from '../../../lib/ocrPreprocess';

type Rotation = 0 | 90 | 180 | 270;

interface Settings {
  primary: string;
  withEnglish: boolean;
  layout: OcrLayout;
  straighten: boolean;
}

const SETTINGS_KEY = 'bench-ocr-settings';
const DEFAULT_SETTINGS: Settings = { primary: 'ara', withEnglish: true, layout: 'auto', straighten: true };

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const s = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as Settings;
      if (OCR_LANGUAGES.some((l) => l.code === s.primary)) return s;
    }
  } catch {
    // storage unavailable — fall through to defaults
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

function languagesFor(s: Settings): string[] {
  return s.withEnglish && s.primary !== 'eng' ? [s.primary, 'eng'] : [s.primary];
}

function downloadText(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

function toMarkdown(text: string, source: string) {
  const body = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n\n');
  return `<!-- Text extracted from ${source} with Bench Image to Text -->\n\n${body}\n`;
}

function imageFromClipboardEvent(e: ClipboardEvent): File | null {
  for (const item of Array.from(e.clipboardData?.items ?? [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) return new File([f], f.name && f.name !== 'image.png' ? f.name : `pasted-image.${item.type.split('/')[1] || 'png'}`, { type: item.type });
    }
  }
  return null;
}

export default function ImageToText() {
  const [file, setFile] = useState<File | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [stats, setStats] = useState<{ confidence: number; ms: number; langs: string } | null>(null);
  const [ranWith, setRanWith] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const runId = useRef(0);

  const langs = languagesFor(settings);
  const configKey = `${langs.join('+')}|${settings.layout}|${settings.straighten}|${rotation}`;
  const primaryMeta = OCR_LANGUAGES.find((l) => l.code === settings.primary)!;

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);
  useEffect(() => () => bitmap?.close(), [bitmap]);
  // Free the OCR worker (and its loaded language models) when leaving the tool.
  useEffect(() => () => void terminateOcr(), []);

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice((n) => (n === msg ? null : n)), 1800);
  }, []);

  const runOcr = useCallback(
    async (bmp: ImageBitmap, rot: Rotation, s: Settings) => {
      const id = ++runId.current;
      setBusy(true);
      setError(null);
      setProgress({ stage: 'loading', fraction: 0 });
      try {
        // Let the progress UI paint before the synchronous canvas work.
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const prepared = preprocessForOcr(bmp, { rotation: rot, deskew: s.straighten });
        const codes = languagesFor(s);
        const result = await recognizeText(prepared, codes, {
          layout: s.layout,
          onProgress: (p) => id === runId.current && setProgress(p),
        });
        if (id !== runId.current) return;
        setText(result.text);
        setStats({ confidence: result.confidence, ms: result.ms, langs: codes.join('+') });
        setRanWith(`${codes.join('+')}|${s.layout}|${s.straighten}|${rot}`);
        setMatchIndex(0);
        if (!result.text) setError('No text was found in this image. If it does contain text, try rotating it, choosing the right language, or a sharper image.');
      } catch (e) {
        if (id !== runId.current) return;
        setError(e instanceof Error && e.message ? `Text recognition failed: ${e.message}` : 'Text recognition failed. Please try again.');
      } finally {
        if (id === runId.current) {
          setBusy(false);
          setProgress(null);
        }
      }
    },
    [],
  );

  const loadFile = useCallback(
    async (f: File) => {
      if (!f.type.startsWith('image/') && !/\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(f.name)) {
        setError('That file isn’t an image. Choose a PNG, JPEG, WebP, GIF or BMP.');
        return;
      }
      runId.current++;
      void terminateOcr();
      setError(null);
      setText('');
      setStats(null);
      setRanWith('');
      try {
        const bmp = await decodeImage(f);
        setFile(f);
        setBitmap(bmp);
        setPreviewUrl(URL.createObjectURL(f));
        setRotation(0);
        void runOcr(bmp, 0, settings);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'This image couldn’t be opened.');
      }
    },
    [runOcr, settings],
  );

  // Paste an image anywhere on the page (Ctrl/Cmd+V), unless typing in a field.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const img = imageFromClipboardEvent(e);
      if (!img) return;
      e.preventDefault();
      void loadFile(img);
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [loadFile]);

  async function pasteFromButton() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'));
        if (type) {
          const blob = await item.getType(type);
          await loadFile(new File([blob], `pasted-image.${type.split('/')[1] || 'png'}`, { type }));
          return;
        }
      }
      setError('There’s no image on your clipboard. Copy an image or take a screenshot first.');
    } catch {
      setError('Your browser didn’t allow reading the clipboard here. Press Ctrl+V (⌘V on Mac) on this page instead.');
    }
  }

  function cancel() {
    runId.current++;
    void terminateOcr();
    setBusy(false);
    setProgress(null);
  }

  function reset() {
    cancel();
    setFile(null);
    setBitmap(null);
    setPreviewUrl(null);
    setText('');
    setStats(null);
    setError(null);
    setQuery('');
  }

  const matches = useMemo(() => {
    if (!query.trim() || !text) return [] as number[];
    const out: number[] = [];
    const hay = text.toLocaleLowerCase();
    const needle = query.toLocaleLowerCase();
    for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + needle.length)) out.push(i);
    return out;
  }, [query, text]);

  function goToMatch(dir: 1 | -1) {
    if (!matches.length || !textareaRef.current) return;
    const next = (matchIndex + dir + matches.length) % matches.length;
    setMatchIndex(next);
    const ta = textareaRef.current;
    const start = matches[next];
    ta.focus();
    ta.setSelectionRange(start, start + query.length);
    // Scroll the selection into view: measure with a temporary blur/focus.
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 24;
    const line = text.slice(0, start).split('\n').length - 1;
    ta.scrollTop = Math.max(0, line * lineHeight - ta.clientHeight / 3);
  }

  async function copySelected() {
    const ta = textareaRef.current;
    if (!ta) return;
    const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
    if (!sel) {
      flash('Select some text first');
      return;
    }
    flash((await copyToClipboard(sel)) ? 'Selection copied' : 'Copy failed');
  }

  const baseName = file ? file.name.replace(/\.[^.]+$/, '') : 'text';
  const settingsChanged = Boolean(ranWith) && ranWith !== configKey;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const stageLabel =
    progress?.stage === 'recognizing'
      ? `Reading text… ${Math.round(progress.fraction * 100)}%`
      : `Loading ${primaryMeta.label}${langs.length > 1 ? ' + English' : ''} recognition data…`;

  function update(patch: Partial<Settings>) {
    setSettings((s) => ({ ...s, ...patch }));
  }

  const languagePicker = (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-xs text-ink/60">
        Language of the text
        <select
          value={settings.primary}
          onChange={(e) => update({ primary: e.target.value })}
          disabled={busy}
          className="mt-1 block rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink"
        >
          {OCR_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}{l.native !== l.label ? ` — ${l.native}` : ''}
            </option>
          ))}
        </select>
      </label>
      {settings.primary !== 'eng' && (
        <label className="flex items-center gap-2 pb-2 text-xs text-ink/70">
          <input type="checkbox" checked={settings.withEnglish} disabled={busy} onChange={(e) => update({ withEnglish: e.target.checked })} />
          Also contains English
        </label>
      )}
    </div>
  );

  if (!file || !bitmap) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {languagePicker}
        <FileDropzone
          accept="image/*"
          onFiles={(files) => void loadFile(files[0])}
          label="Drop an image here, click to browse, or paste with Ctrl+V"
          hint="Screenshots, scans or photos of documents — PNG, JPEG, WebP"
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink/50">
          <Button variant="secondary" onClick={() => void pasteFromButton()}>Paste image from clipboard</Button>
          <span>Text is recognized on your device. The image is never uploaded.</span>
        </div>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </div>
    );
  }

  return (
    <div data-workspace className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-line bg-paper-dim p-3">
        {languagePicker}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={reset}>New image</Button>
          {busy ? (
            <Button variant="secondary" onClick={cancel}>Cancel</Button>
          ) : (
            <Button onClick={() => void runOcr(bitmap, rotation, settings)}>{ranWith ? 'Re-run OCR' : 'Extract text'}</Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Original image */}
        <section aria-label="Original image" className="flex min-w-0 flex-col rounded-lg border border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 text-xs text-ink/60">
            <span className="truncate">{file.name} · {bitmap.width}×{bitmap.height} · {formatBytes(file.size)}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setRotation((r) => (((r + 270) % 360) as Rotation))}
                disabled={busy}
                aria-label="Rotate image left"
                title="Rotate left"
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-paper-dim disabled:opacity-40"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button
                onClick={() => setRotation((r) => (((r + 90) % 360) as Rotation))}
                disabled={busy}
                aria-label="Rotate image right"
                title="Rotate right"
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-paper-dim disabled:opacity-40"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
          <div className="flex min-h-[240px] flex-1 items-center justify-center overflow-hidden bg-grid-paper p-3">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Image to extract text from"
                className="max-h-[60vh] max-w-full object-contain shadow-sm transition-transform"
                style={{ transform: `rotate(${rotation}deg)`, ...(rotation % 180 ? { maxWidth: '60vh', maxHeight: '100%' } : {}) }}
              />
            )}
          </div>
          <details className="border-t border-line px-3 py-2 text-xs text-ink/60">
            <summary className="cursor-pointer select-none">Recognition options</summary>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={settings.straighten} disabled={busy} onChange={(e) => update({ straighten: e.target.checked })} />
                Straighten tilted text automatically
              </label>
              <label className="flex items-center gap-2">
                Layout
                <select value={settings.layout} disabled={busy} onChange={(e) => update({ layout: e.target.value as OcrLayout })} className="rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink">
                  <option value="auto">Automatic (pages, columns)</option>
                  <option value="block">Single block of text</option>
                  <option value="line">Single line</option>
                </select>
              </label>
            </div>
          </details>
        </section>

        {/* Extracted text */}
        <section aria-label="Extracted text" className="flex min-w-0 flex-col rounded-lg border border-line">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
            <div className="relative min-w-[10rem] flex-1">
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setMatchIndex(-1);
                }}
                onKeyDown={(e) => e.key === 'Enter' && goToMatch(e.shiftKey ? -1 : 1)}
                placeholder="Search in text"
                aria-label="Search in extracted text"
                dir="auto"
                className="w-full rounded-md border border-line bg-paper px-2 py-1 text-xs"
              />
            </div>
            {query.trim() && (
              <span className="flex items-center gap-1 text-xs text-ink/50" aria-live="polite">
                {matches.length ? `${Math.max(0, matchIndex) + 1}/${matches.length}` : 'No matches'}
                <button onClick={() => goToMatch(-1)} disabled={!matches.length} aria-label="Previous match" className="rounded px-1 hover:bg-paper-dim disabled:opacity-30">↑</button>
                <button onClick={() => goToMatch(1)} disabled={!matches.length} aria-label="Next match" className="rounded px-1 hover:bg-paper-dim disabled:opacity-30">↓</button>
              </span>
            )}
          </div>

          <div className="relative flex flex-1 flex-col">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              dir="auto"
              spellCheck={false}
              aria-label="Extracted text (editable)"
              placeholder={busy ? '' : 'Extracted text will appear here. You can edit it before copying or downloading.'}
              className="min-h-[320px] w-full flex-1 resize-y bg-paper p-3 text-[15px] leading-7 outline-none"
              // plaintext: each line/paragraph picks its own direction, so
              // Arabic paragraphs read right-to-left and English ones left-to-right.
              style={{ unicodeBidi: 'plaintext', fontFamily: '"Segoe UI", Tahoma, "Noto Naskh Arabic", "Noto Sans", Inter, system-ui, sans-serif' }}
            />
            {busy && progress && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-paper/85 p-6" aria-live="polite">
                <div className="w-full max-w-xs">
                  <ProgressBar value={progress.stage === 'recognizing' ? progress.fraction * 100 : 0} label={stageLabel} />
                </div>
                <p className="text-center text-xs text-ink/50">The first run downloads this language’s recognition data once; after that it’s cached on your device.</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2">
            <div className="flex flex-wrap gap-1.5">
              <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={!text} onClick={async () => flash((await copyToClipboard(text)) ? 'Copied all text' : 'Copy failed')}>Copy all</Button>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={!text} onClick={() => void copySelected()}>Copy selection</Button>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={!text} onClick={() => downloadText(text, `${baseName}.txt`, 'text/plain')}>Download .txt</Button>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={!text} onClick={() => downloadText(toMarkdown(text, file.name), `${baseName}.md`, 'text/markdown')}>Download .md</Button>
              <Button variant="ghost" className="px-3 py-1.5 text-xs" disabled={!text} onClick={() => setText('')}>Clear</Button>
            </div>
            <span className="text-xs text-ink/50" aria-live="polite">
              {notice ?? (stats ? `${words} words · ${Math.round(stats.ms / 100) / 10}s` : '')}
            </span>
          </div>
        </section>
      </div>

      {settingsChanged && !busy && (
        <p className="text-xs text-ink/60">Settings changed — click <strong>Re-run OCR</strong> to apply them.</p>
      )}
      {stats && stats.confidence < 65 && text && (
        <p className="rounded-md border border-line bg-paper-dim px-3 py-2 text-xs text-ink/70">
          Recognition confidence is low ({Math.round(stats.confidence)}%). Check the result carefully. Sharper, well-lit, straight images give
          better results; make sure the right language is selected, and rotate the image if the text is sideways.
        </p>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
}
