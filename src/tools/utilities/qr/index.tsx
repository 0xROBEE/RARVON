import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import DownloadButton from '../../../components/DownloadButton';
import { ChoicePills } from '../../../components/tool/TextPanes';
import { ResultStage, SettingRow, StageSettings } from '../../../components/tool/Stage';
import { tr } from '../../../lib/i18n';

const SIZES = ['240', '320', '480', '640'] as const;
type Size = (typeof SIZES)[number];
/** Dark colours that still scan well on white. */
const COLORS = [
  { value: '#14171c', name: 'Black' },
  { value: '#4338ca', name: 'Violet' },
  { value: '#15803d', name: 'Green' },
  { value: '#1d4ed8', name: 'Blue' },
  { value: '#b91c1c', name: 'Red' },
];

export default function QrTool() {
  const [text, setText] = useState('https://example.com');
  const [size, setSize] = useState<Size>('320');
  const [dark, setDark] = useState(COLORS[0].value);
  const [dataUrl, setDataUrl] = useState('');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!text.trim() || !canvasRef.current) {
      setDataUrl('');
      setSvg('');
      return;
    }
    const options = { width: Number(size), margin: 2, color: { dark, light: '#ffffff' } };
    let live = true;
    Promise.all([QRCode.toCanvas(canvasRef.current, text, options), QRCode.toString(text, { ...options, type: 'svg' })])
      .then(([, s]) => {
        if (!live) return;
        setDataUrl(canvasRef.current!.toDataURL('image/png'));
        setSvg(s);
        setError(null);
      })
      .catch(() => live && setError(tr('Could not generate a QR code for that input.')));
    return () => { live = false; };
  }, [text, size, dark]);

  const svgUrl = useMemo(() => (svg ? URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })) : ''), [svg]);
  useEffect(() => () => { if (svgUrl) URL.revokeObjectURL(svgUrl); }, [svgUrl]);
  const empty = !text.trim();

  return (
    <div className="space-y-3">
      <label className="block rounded-2xl border border-line bg-paper p-3 focus-within:border-[color:var(--color-cat-utilities)]">
        <span className="mb-1.5 block text-xs font-semibold text-ink-2">{tr('Text or URL')}</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="https://rarvon.com"
          className="code-field w-full bg-transparent text-lg text-ink placeholder:text-ink-3"
        />
      </label>

      <ResultStage
        label={tr('Your QR code')}
        actions={
          dataUrl && !empty ? (
            <>
              <DownloadButton url={dataUrl} filename="qr-code.png" label={tr('Download PNG')} />
              {svgUrl && <DownloadButton url={svgUrl} filename="qr-code.svg" label={tr('Download SVG')} />}
            </>
          ) : undefined
        }
        footer={tr('Scans with any phone camera. SVG stays sharp at any size, for print.')}
      >
        {error && <p role="alert" className="text-sm font-semibold text-warn">{error}</p>}
        {empty && <p className="text-sm text-ink-3">{tr('Type a link or some text above.')}</p>}
        <div className={empty ? 'hidden' : 'rounded-2xl bg-white p-3 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)]'}>
          <canvas ref={canvasRef} className="block !h-auto !w-[min(260px,70vw)] rounded-lg" aria-label={tr('QR code for {t}', { t: text })} role="img" />
        </div>
      </ResultStage>

      <StageSettings>
        <SettingRow label={tr('Size')}>
          <ChoicePills<Size> label={tr('Size')} value={size} onChange={setSize} options={SIZES.map((s) => ({ value: s, label: `${s} px` }))} />
        </SettingRow>
        <SettingRow label={tr('Colour')}>
          <div role="radiogroup" aria-label={tr('Colour')} className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={dark === c.value}
                aria-label={tr(c.name)}
                onClick={() => setDark(c.value)}
                className="grid h-8 w-8 place-items-center rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: c.value, borderColor: dark === c.value ? 'var(--color-cat-utilities)' : 'var(--color-line)', boxShadow: dark === c.value ? '0 0 0 2px var(--color-paper) inset' : undefined }}
              />
            ))}
          </div>
        </SettingRow>
      </StageSettings>
    </div>
  );
}
