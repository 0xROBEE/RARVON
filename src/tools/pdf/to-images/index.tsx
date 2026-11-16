import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import FileDropzone from '../../../components/FileDropzone';
import Button from '../../../components/Button';
import ErrorMessage from '../../../components/ErrorMessage';
import { openPdfForRendering, renderPdfPageToCanvas } from '../../../lib/pdfjs';
import { canvasToBlob, formatBytes } from '../../../lib/imageUtils';
import { ActionBar } from '../../../components/tool';
import { ConvertFlow, FormatPills } from '../../../components/tool/ConvertFlow';
import { DocTile } from '../../../components/tool/CompressFlow';
import { PageGrid } from '../../../components/tool/PageGrid';
import { tr } from '../../../lib/i18n';

type Format = 'image/png' | 'image/jpeg';
const FORMATS: { value: Format; label: string; hint: string }[] = [
  { value: 'image/png', label: 'PNG', hint: 'Sharp text, larger files' },
  { value: 'image/jpeg', label: 'JPG', hint: 'Smaller, for photos' },
];
const SCALES = [
  { value: '1', label: '1×', hint: 'Screen' },
  { value: '2', label: '2×', hint: 'Sharp' },
  { value: '3', label: '3×', hint: 'Print' },
  { value: '4', label: '4×', hint: 'Very large' },
];

interface Page {
  id: string;
  src: string | null;
  widthPt: number;
  heightPt: number;
}

export default function PdfToImages() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<Format>('image/png');
  const [scale, setScale] = useState(2);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);

  function handleFile(files: File[]) {
    setFile(files[0]);
    setResult(null);
    setError(null);
  }

  // Thumbnails of every page, filled in one by one.
  useEffect(() => {
    setPages([]);
    setPicked(new Set());
    if (!file) return;
    let stale = false;
    (async () => {
      try {
        const pdf = await openPdfForRendering(await file.arrayBuffer());
        try {
          const blank = Array.from({ length: pdf.numPages }, (_, i) => ({ id: `p${i + 1}`, src: null, widthPt: 0, heightPt: 0 }));
          if (stale) return;
          setPages(blank);
          setPicked(new Set(blank.map((p) => p.id)));
          for (let i = 1; i <= pdf.numPages && !stale; i++) {
            const { canvas, widthPt, heightPt } = await pdf.renderPage(i, 0.35);
            const src = canvas.toDataURL('image/jpeg', 0.8);
            canvas.width = 0;
            if (!stale) setPages((list) => list.map((p) => (p.id === `p${i}` ? { ...p, src, widthPt, heightPt } : p)));
          }
        } finally {
          void pdf.destroy();
        }
      } catch {
        if (!stale) setError(tr("Could not convert this PDF to images."));
      }
    })();
    return () => { stale = true; };
  }, [file]);

  const chosen = pages.filter((p) => picked.has(p.id));
  const first = chosen.find((p) => p.widthPt) ?? pages.find((p) => p.widthPt);
  const pixel = first ? `${Math.round(first.widthPt * scale)}×${Math.round(first.heightPt * scale)} px` : '';
  const ext = format === 'image/png' ? 'png' : 'jpg';
  const label = format === 'image/png' ? 'PNG' : 'JPG';

  const toggle = (id: string) => {
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResult(null);
  };

  async function convert() {
    if (!file || !chosen.length) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress(0);
    try {
      const bytes = await file.arrayBuffer();
      const base = file.name.replace(/\.pdf$/i, '');
      const numbers = chosen.map((p) => Number(p.id.slice(1)));

      if (numbers.length === 1) {
        const canvas = await renderPdfPageToCanvas(bytes.slice(0), numbers[0], scale);
        const blob = await canvasToBlob(canvas, format, 0.92);
        setResult({ url: URL.createObjectURL(blob), name: pages.length === 1 ? `${base}.${ext}` : `${base}-page-${numbers[0]}.${ext}`, size: blob.size });
      } else {
        const zip = new JSZip();
        for (const [k, n] of numbers.entries()) {
          const canvas = await renderPdfPageToCanvas(bytes.slice(0), n, scale);
          const blob = await canvasToBlob(canvas, format, 0.92);
          zip.file(`${base}-page-${n}.${ext}`, blob);
          setProgress((k + 1) / numbers.length);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        setResult({ url: URL.createObjectURL(zipBlob), name: `${base}-images.zip`, size: zipBlob.size });
      }
    } catch {
      setError(tr("Could not convert this PDF to images."));
    } finally {
      setBusy(false);
    }
  }

  const cover = pages[0]?.src;
  const coverImg = cover ? <img src={cover} alt="" className="h-full w-full bg-white object-cover object-top" /> : <DocTile kind="pdf" />;
  const many = chosen.length !== 1;

  return (
    <div className="space-y-4">
      {!file && <FileDropzone accept="application/pdf" onFiles={handleFile} />}

      {file && (
        <div className="slide-in space-y-4">
          <ConvertFlow
            from={{ preview: coverImg, name: file.name, detail: pages.length ? `${pages.length === 1 ? tr('1 page') : tr('{n} pages', { n: pages.length })} · ${formatBytes(file.size)}` : formatBytes(file.size), format: 'PDF' }}
            to={{
              preview: coverImg,
              name: result?.name ?? (many ? tr('{n} {f} images', { n: chosen.length, f: label }) : tr('1 {f} image', { f: label })),
              detail: result ? formatBytes(result.size) : many ? `${tr('in a ZIP')} · ${pixel}` : pixel,
              format: many ? 'ZIP' : label,
            }}
            state={busy ? 'busy' : result ? 'done' : 'idle'}
            progress={busy && many ? progress : undefined}
            onRemove={() => { setFile(null); setResult(null); setError(null); }}
            result={result ? { url: result.url, filename: result.name } : undefined}
          />

          {pages.length > 1 && (
            <div className="grid gap-2 rounded-xl border border-line bg-elevated p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-ink-2">{tr('Tap pages to choose which ones to save · {n} of {total} chosen', { n: chosen.length, total: pages.length })}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => { setPicked(new Set(pages.map((p) => p.id))); setResult(null); }} className="rounded-md border border-line bg-paper px-2.5 py-1 text-xs font-semibold hover:border-ink">{tr('All')}</button>
                  <button onClick={() => { setPicked(new Set()); setResult(null); }} className="rounded-md border border-line bg-paper px-2.5 py-1 text-xs font-semibold hover:border-ink">{tr('None')}</button>
                </div>
              </div>
              <PageGrid items={pages.map((p) => ({ id: p.id, src: p.src }))} selected={picked} onToggle={toggle} />
            </div>
          )}

          <div className="grid gap-4 rounded-xl border border-line bg-elevated p-3 sm:grid-cols-2 sm:p-4">
            <div>
              <p className="mb-2 text-xs font-medium text-ink-2">{tr('Format')}</p>
              <FormatPills options={FORMATS} value={format} onChange={(f) => { setFormat(f); setResult(null); }} disabled={busy} label="Format" />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-ink-2">{tr('Sharpness')}</p>
              <FormatPills options={SCALES} value={String(scale)} onChange={(v) => { setScale(Number(v)); setResult(null); }} disabled={busy} label="Sharpness" />
            </div>
          </div>

          <ActionBar><Button onClick={convert} disabled={busy || !chosen.length} className="sm:ms-auto">{busy ? tr("Converting…") : tr("Convert to images")}</Button></ActionBar>
        </div>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
}
