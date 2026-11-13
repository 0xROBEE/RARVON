import { useEffect, useMemo, useRef, useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import ErrorMessage from '../../../components/ErrorMessage';
import ProgressBar from '../../../components/ProgressBar';
import { formatBytes } from '../../../lib/imageUtils';
import { PasswordRequired, extractPdfText, renderPdfPageToCanvas } from '../../../lib/pdfjs';
import type { PdfPageText } from '../../../lib/pdfjs';
import { OCR_LANGUAGES, recognizeText, terminateOcr } from '../../../lib/ocrEngine';
import { preprocessForOcr } from '../../../lib/ocrPreprocess';

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

/** Pages with fewer meaningful characters than this are treated as scanned images. */
const MIN_TEXT_CHARS = 15;

export default function PdfToText() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<PdfPageText[]>([]);
  const [ocrDone, setOcrDone] = useState<Set<number>>(new Set());
  const [separators, setSeparators] = useState(true);
  /** The user's edits; null while the text simply mirrors the extracted pages. */
  const [editedText, setEditedText] = useState<string | null>(null);
  const [lang, setLang] = useState('ara');
  const [withEnglish, setWithEnglish] = useState(true);
  const [busy, setBusy] = useState<null | 'reading' | 'ocr'>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const scanned = useMemo(
    () => pages.filter((p) => p.text.replace(/\s/g, '').length < MIN_TEXT_CHARS && !ocrDone.has(p.page)).map((p) => p.page),
    [pages, ocrDone],
  );

  // The combined text mirrors the pages until the user edits it.
  const generated = useMemo(
    () =>
      pages
        .filter((p) => p.text)
        .map((p) => (separators && pages.length > 1 ? `--- Page ${p.page} ---\n${p.text}` : p.text))
        .join('\n\n'),
    [pages, separators],
  );
  const text = editedText ?? generated;
  const edited = editedText !== null;

  useEffect(() => () => void terminateOcr(), []);

  async function open(f: File) {
    setError(null);
    setNotice(null);
    setPages([]);
    setOcrDone(new Set());
    setEditedText(null);
    setBusy('reading');
    setProgress(0);
    try {
      const data = await f.arrayBuffer();
      const result = await extractPdfText(data.slice(0), (done, total) => setProgress(done / total));
      setFile(f);
      setBytes(data);
      setPages(result);
    } catch (e) {
      setFile(null);
      setError(e instanceof PasswordRequired
        ? 'This PDF is password-protected. Remove the password in your PDF app first, then try again.'
        : 'This file couldn’t be read as a PDF. It may be damaged or not a PDF.');
    } finally {
      setBusy(null);
    }
  }

  async function runOcr() {
    if (!bytes || !scanned.length) return;
    cancelRef.current = false;
    setBusy('ocr');
    setError(null);
    setProgress(0);
    const langs = withEnglish && lang !== 'eng' ? [lang, 'eng'] : [lang];
    try {
      const todo = [...scanned];
      for (let i = 0; i < todo.length; i++) {
        if (cancelRef.current) break;
        const n = todo[i];
        const canvas = await renderPdfPageToCanvas(bytes.slice(0), n, 2.5);
        const r = await recognizeText(preprocessForOcr(canvas), langs, {
          onProgress: (p) => p.stage === 'recognizing' && setProgress((i + p.fraction) / todo.length),
        });
        if (cancelRef.current) break;
        setEditedText(null);
        setPages((prev) => prev.map((p) => (p.page === n ? { ...p, text: r.text } : p)));
        setOcrDone((prev) => new Set(prev).add(n));
        setProgress((i + 1) / todo.length);
      }
      if (!cancelRef.current) setNotice(`Recognized text on ${todo.length} scanned page${todo.length === 1 ? '' : 's'} with OCR — check it for mistakes.`);
    } catch (e) {
      setError(e instanceof Error ? `OCR failed: ${e.message}` : 'OCR failed.');
    } finally {
      setBusy(null);
    }
  }

  function cancel() {
    cancelRef.current = true;
    void terminateOcr();
    setBusy(null);
  }

  const base = file?.name.replace(/\.pdf$/i, '') ?? 'document';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-4">
      {!file ? (
        <FileDropzone accept="application/pdf" onFiles={(f) => void open(f[0])} hint="Text is extracted on your device — the PDF isn’t uploaded" />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper-dim p-3 text-sm">
          <span className="truncate">{file.name} · {formatBytes(file.size)} · {pages.length} page{pages.length === 1 ? '' : 's'}</span>
          <button onClick={() => { cancel(); setFile(null); setPages([]); setBytes(null); setNotice(null); }} className="text-xs font-medium text-workshop hover:underline">Remove</button>
        </div>
      )}
      {busy === 'reading' && <ProgressBar value={progress * 100} label="Reading text…" />}

      {file && scanned.length > 0 && busy !== 'reading' && (
        <div className="space-y-3 rounded-md border border-line bg-paper-dim p-3">
          <p className="text-sm">
            {scanned.length === pages.length
              ? 'This PDF has no text layer — it looks like a scan or photos of pages.'
              : `${scanned.length} page${scanned.length === 1 ? '' : 's'} (${scanned.slice(0, 8).join(', ')}${scanned.length > 8 ? '…' : ''}) look${scanned.length === 1 ? 's' : ''} scanned and ha${scanned.length === 1 ? 's' : 've'} no text layer.`}
            {' '}Bench can read them with OCR, on your device.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-ink-2">
              Language
              <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={busy === 'ocr'} className="mt-1 block rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink">
                {OCR_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}{l.native !== l.label ? ` — ${l.native}` : ''}</option>)}
              </select>
            </label>
            {lang !== 'eng' && (
              <label className="flex items-center gap-2 pb-2 text-xs text-ink-2">
                <input type="checkbox" checked={withEnglish} onChange={(e) => setWithEnglish(e.target.checked)} disabled={busy === 'ocr'} />
                Also contains English
              </label>
            )}
            {busy === 'ocr' ? (
              <Button variant="secondary" onClick={cancel}>Cancel</Button>
            ) : (
              <Button onClick={() => void runOcr()}>Read scanned pages with OCR</Button>
            )}
          </div>
          {busy === 'ocr' && <ProgressBar value={progress * 100} label={`Recognizing text… ${Math.round(progress * 100)}%`} />}
        </div>
      )}

      {file && busy !== 'reading' && (
        <section aria-label="Extracted text" className="rounded-lg border border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 text-xs text-ink-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={separators} onChange={(e) => { setSeparators(e.target.checked); setEditedText(null); }} />
              Page separators
            </label>
            <span>{words.toLocaleString()} words{edited ? ' · edited' : ''}</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setEditedText(e.target.value)}
            dir="auto"
            spellCheck={false}
            aria-label="Extracted text (editable)"
            placeholder={scanned.length === pages.length ? 'No text layer yet — use OCR above.' : ''}
            className="min-h-[360px] w-full resize-y bg-paper p-3 text-[15px] leading-7 outline-none"
            style={{ unicodeBidi: 'plaintext', fontFamily: '"Segoe UI", Tahoma, "Noto Naskh Arabic", "Noto Sans", Inter, system-ui, sans-serif' }}
          />
          <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2">
            <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={!text} onClick={() => void navigator.clipboard.writeText(text).then(() => setNotice('Copied all text.'))}>Copy all</Button>
            <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={!text} onClick={() => downloadText(text, `${base}.txt`, 'text/plain')}>Download .txt</Button>
            <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={!text} onClick={() => downloadText(text.replace(/^--- Page (\d+) ---$/gm, '## Page $1'), `${base}.md`, 'text/markdown')}>Download .md</Button>
          </div>
        </section>
      )}

      {notice && <p role="status" className="text-xs text-ink-2">{notice}</p>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
}
