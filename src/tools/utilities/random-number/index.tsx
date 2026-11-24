import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { CopyButton } from '../../../components/tool';
import { ChoicePills, ToggleChip } from '../../../components/tool/TextPanes';
import { NumberPill, RefreshIcon, ResultStage, SettingRow, StageButton, StageSettings } from '../../../components/tool/Stage';
import { tr } from '../../../lib/i18n';

function secureRandomInt(min: number, max: number): number {
  // Inclusive of both min and max. Uses rejection sampling over a
  // cryptographically secure source to avoid modulo bias.
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8) || 1;
  const maxValid = Math.floor(256 ** bytesNeeded / range) * range - 1;
  const bytes = new Uint8Array(bytesNeeded);
  let value: number;
  do {
    crypto.getRandomValues(bytes);
    value = bytes.reduce((acc, b, i) => acc + b * 256 ** i, 0);
  } while (value > maxValid);
  return min + (value % range);
}

function secureRandomFloat(min: number, max: number, decimals: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return Number((min + (buf[0] / 4294967296) * (max - min)).toFixed(decimals));
}

type Mode = 'integer' | 'decimal';

export default function RandomNumberTool() {
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [count, setCount] = useState(5);
  const [mode, setMode] = useState<Mode>('integer');
  const [decimals, setDecimals] = useState(2);
  const [allowDuplicates, setAllowDuplicates] = useState(true);
  const [sorted, setSorted] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);

  const generate = useCallback(() => {
    if (![min, max, count].every(Number.isFinite) || count < 1) {
      setError(tr('Fill in all the numbers.'));
      return;
    }
    if (min > max) {
      setError(tr('Minimum must be less than or equal to maximum.'));
      return;
    }
    if (count > 1000) {
      setError(tr('Up to 1,000 numbers at a time.'));
      return;
    }
    if (mode === 'integer' && !allowDuplicates && Math.floor(max) - Math.ceil(min) + 1 < count) {
      setError(tr('The range is too small to generate that many unique numbers.'));
      return;
    }
    setError(null);
    let list: number[];
    if (mode === 'decimal') list = Array.from({ length: count }, () => secureRandomFloat(min, max, decimals));
    else if (allowDuplicates) list = Array.from({ length: count }, () => secureRandomInt(Math.ceil(min), Math.floor(max)));
    else {
      const pool: number[] = [];
      for (let i = Math.ceil(min); i <= Math.floor(max); i++) pool.push(i);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = secureRandomInt(0, i);
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      list = pool.slice(0, count);
    }
    setResults(list);
    setRound((r) => r + 1);
  }, [min, max, count, mode, decimals, allowDuplicates]);

  // A first roll when the tool opens.
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = sorted ? [...results].sort((a, b) => a - b) : results;
  const big = shown.length <= 12;

  return (
    <div>
      <ResultStage
        label={tr('Your numbers')}
        actions={
          <>
            <StageButton primary onClick={generate}><RefreshIcon />{tr('Generate')}</StageButton>
            <CopyButton variant="button" text={shown.join('\n')} label="Copy all" disabled={!shown.length} className="!rounded-full !px-5" />
          </>
        }
        footer={shown.length ? tr(shown.length === 1 ? '{n} number' : '{n} numbers', { n: shown.length }) : undefined}
      >
        {error ? (
          <p role="alert" className="text-sm font-semibold text-warn">{error}</p>
        ) : (
          <div key={round} className={clsx('flex max-h-80 flex-wrap justify-center overflow-y-auto', big ? 'gap-2.5' : 'gap-1.5')} data-testid="numbers">
            {shown.map((n, i) => (
              <span
                key={i}
                className={clsx(
                  'tile-pop grid place-items-center rounded-xl border-2 bg-paper font-mono font-semibold tabular-nums',
                  big ? 'min-h-16 min-w-16 px-3 text-2xl sm:text-3xl' : 'min-h-9 min-w-12 px-2 text-sm',
                )}
                style={{ borderColor: 'color-mix(in srgb, var(--color-cat-utilities) 55%, var(--color-line))', animationDelay: `${Math.min(i, 30) * 35}ms` }}
              >
                {n}
              </span>
            ))}
          </div>
        )}
      </ResultStage>

      <StageSettings>
        <SettingRow label={tr('Type')}>
          <ChoicePills<Mode> label={tr('Number type')} value={mode} onChange={setMode} options={[{ value: 'integer', label: tr('Whole numbers') }, { value: 'decimal', label: tr('Decimals') }]} />
        </SettingRow>
        <SettingRow label={tr('Range')}>
          <NumberPill label={tr('Min')} value={min} onChange={setMin} />
          <NumberPill label={tr('Max')} value={max} onChange={setMax} />
          {mode === 'decimal' && <NumberPill label={tr('Decimals')} value={decimals} onChange={(n) => setDecimals(Math.min(10, Math.max(0, n || 0)))} min={0} max={10} />}
        </SettingRow>
        <SettingRow label={tr('How many')}>
          <NumberPill label={tr('Count')} value={count} onChange={setCount} min={1} max={1000} />
          {mode === 'integer' && <ToggleChip on={allowDuplicates} onChange={setAllowDuplicates}>{tr('Allow duplicate values')}</ToggleChip>}
          <ToggleChip on={sorted} onChange={setSorted}>{tr('Sort from low to high')}</ToggleChip>
        </SettingRow>
      </StageSettings>
    </div>
  );
}
