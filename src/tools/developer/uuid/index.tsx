import { useCallback, useEffect, useState } from 'react';
import { ChoicePills, ToggleChip } from '../../../components/tool/TextPanes';
import { CodeView, DevWorkspace, PaneAction, StatusBar } from '../../../components/tool/CodePanes';
import { tr } from '../../../lib/i18n';

type Version = 'v4' | 'v7';

/** UUID v7: the time in milliseconds first, then random bits, so new IDs sort after older ones. */
function uuidV7(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  let ms = Date.now();
  for (let i = 5; i >= 0; i--) {
    b[i] = ms % 256;
    ms = Math.floor(ms / 256);
  }
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export default function UuidTool() {
  const [count, setCount] = useState(5);
  const [version, setVersion] = useState<Version>('v4');
  const [uppercase, setUppercase] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [ids, setIds] = useState<string[]>([]);

  const generate = useCallback(() => {
    setIds(Array.from({ length: count }, () => (version === 'v7' ? uuidV7() : crypto.randomUUID())));
  }, [count, version]);
  useEffect(generate, [generate]);

  const shown = ids.map((u) => {
    const s = hyphens ? u : u.replace(/-/g, '');
    return uppercase ? s.toUpperCase() : s;
  });
  const text = shown.join('\n');

  return (
    <DevWorkspace
      single
      status={
        <StatusBar
          state="ok"
          message={version === 'v7' ? tr('Version 7 · time-ordered') : tr('Version 4 · random')}
          items={[tr(shown.length === 1 ? '{n} UUID' : '{n} UUIDs', { n: shown.length })]}
          right={
            <label className="inline-flex items-center gap-1.5 text-[11px] text-ink-3">
              {tr('Count')}
              <input
                type="number"
                min={1}
                max={1000}
                value={count}
                onChange={(e) => setCount(Math.min(1000, Math.max(1, Number(e.target.value) || 1)))}
                className="w-16 rounded border border-line bg-paper px-1.5 py-0.5 text-[11px] text-ink"
              />
            </label>
          }
        />
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <ChoicePills<Version> label={tr('UUID version')} value={version} onChange={setVersion} options={[{ value: 'v4', label: tr('v4 · random') }, { value: 'v7', label: tr('v7 · time-ordered') }]} />
        <ToggleChip on={uppercase} onChange={setUppercase}>{tr('Uppercase')}</ToggleChip>
        <ToggleChip on={hyphens} onChange={setHyphens}>{tr('Hyphens')}</ToggleChip>
      </div>
      <CodeView file="uuids.txt" label={tr('UUIDs')} text={text} minRows={Math.min(count, 12)} download="uuids.txt" actions={<PaneAction onClick={generate}>{tr('Generate new')}</PaneAction>} />
    </DevWorkspace>
  );
}
