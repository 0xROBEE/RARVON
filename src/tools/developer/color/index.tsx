import { useMemo, useState } from 'react';
import { DevWorkspace, Pane, StatusBar, ValueRow } from '../../../components/tool/CodePanes';
import { tr } from '../../../lib/i18n';

function hexToRgb(hex: string) {
  const clean = hex.trim().replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Contrast ratio against white and black, to tell which text colour reads on it. */
function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  const ch = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

export default function ColorTool() {
  const [hex, setHex] = useState('#5b56e8');
  const rgb = useMemo(() => hexToRgb(hex), [hex]);
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
  const L = rgb ? luminance(rgb) : 0;
  const onWhite = (1.05 / (L + 0.05)).toFixed(2);
  const onBlack = ((L + 0.05) / 0.05).toFixed(2);
  const textOn = L > 0.4 ? '#14171c' : '#ffffff';

  return (
    <DevWorkspace
      status={
        <StatusBar
          state={rgb ? 'ok' : 'error'}
          message={rgb ? tr('Valid colour') : tr('Enter a valid hex color like #5b56e8.')}
          items={rgb ? [tr('Contrast on white {a}:1', { a: onWhite }), tr('on black {b}:1', { b: onBlack })] : []}
        />
      }
    >
      <Pane file="color" label={tr('Pick a color')}>
        <div className="grid gap-3 p-4">
          <label className="relative block h-36 cursor-pointer overflow-hidden rounded-lg border border-line transition-colors" style={{ background: rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : 'transparent' }}>
            <input type="color" value={rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : '#000000'} onChange={(e) => setHex(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={tr('Pick a color')} />
            {rgb && <span className="absolute bottom-2 start-3 font-mono text-sm font-semibold" style={{ color: textOn }}>{tr('Click to pick')}</span>}
          </label>
          <input
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            placeholder="#5b56e8"
            dir="ltr"
            spellCheck={false}
            aria-label={tr('Hex colour')}
            className="code-field w-full rounded-lg border border-line bg-elevated px-3 py-2.5 font-mono text-lg text-ink focus:border-[color:var(--color-cat-developer)]"
          />
        </div>
      </Pane>
      <Pane file="color.css" label={tr('Colour values')}>
        {rgb && hsl ? (
          <div className="fade-in">
            <ValueRow name="HEX" value={rgbToHex(rgb.r, rgb.g, rgb.b)} />
            <ValueRow name="RGB" value={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`} />
            <ValueRow name="HSL" value={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} />
            <ValueRow name="CSS" value={`--color: ${rgbToHex(rgb.r, rgb.g, rgb.b)};`} />
          </div>
        ) : (
          <p className="grid min-h-[10rem] place-items-center px-6 text-center text-xs text-warn">{tr('Enter a valid hex color like #5b56e8.')}</p>
        )}
      </Pane>
    </DevWorkspace>
  );
}
