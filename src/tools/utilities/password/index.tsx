import { useCallback, useEffect, useState } from 'react';
import { CopyButton } from '../../../components/tool';
import { ToggleChip } from '../../../components/tool/TextPanes';
import { RefreshIcon, ResultStage, SettingRow, StageButton, StageSettings } from '../../../components/tool/Stage';
import { tr } from '../../../lib/i18n';

const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};
type SetName = keyof typeof SETS;
/** Characters people confuse when reading or typing a password. */
const LOOK_ALIKES = /[Il1O0o|]/g;

/** Unbiased random integer in [0, n) from the CSPRNG (rejection sampling). */
function randomIndex(n: number): number {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

function charset(s: SetName, plain: boolean) {
  return plain ? SETS[s].replace(LOOK_ALIKES, '') : SETS[s];
}

function generate(length: number, sets: SetName[], plain: boolean): string {
  const pool = sets.map((s) => charset(s, plain)).join('');
  if (!pool) return '';
  const chars = Array.from({ length }, () => pool[randomIndex(pool.length)]);
  // Guarantee at least one character from every selected set, at random positions.
  const positions = Array.from({ length }, (_, i) => i);
  sets.forEach((s, k) => {
    if (k >= length) return;
    const j = k + randomIndex(length - k);
    [positions[k], positions[j]] = [positions[j], positions[k]];
    const set = charset(s, plain);
    chars[positions[k]] = set[randomIndex(set.length)];
  });
  return chars.join('');
}

function strength(length: number, sets: SetName[], plain: boolean) {
  const poolSize = sets.reduce((sum, s) => sum + charset(s, plain).length, 0);
  const bits = poolSize > 0 ? Math.round(Math.log2(poolSize) * length) : 0;
  if (bits < 40) return { bits, label: 'Weak', level: 1, color: 'var(--color-warn)' };
  if (bits < 70) return { bits, label: 'Okay', level: 2, color: 'var(--color-workshop)' };
  if (bits < 100) return { bits, label: 'Strong', level: 3, color: 'var(--color-signal)' };
  return { bits, label: 'Very strong', level: 4, color: 'var(--color-signal)' };
}

/** The password with digits and symbols in their own colours, so it's easy to read out. */
function Colored({ value }: { value: string }) {
  return (
    <>
      {Array.from(value).map((c, i) => (
        <span key={i} className={/[0-9]/.test(c) ? 'text-[color:var(--color-cat-developer)]' : /[A-Za-z]/.test(c) ? undefined : 'text-warn'}>{c}</span>
      ))}
    </>
  );
}

export default function PasswordTool() {
  const [length, setLength] = useState(20);
  const [sets, setSets] = useState<SetName[]>(['lower', 'upper', 'digits', 'symbols']);
  const [plain, setPlain] = useState(false);
  const [password, setPassword] = useState('');
  const [round, setRound] = useState(0);

  const regenerate = useCallback(() => {
    setPassword(generate(length, sets.length ? sets : ['lower'], plain));
    setRound((r) => r + 1);
  }, [length, sets, plain]);
  // A new password whenever a setting changes.
  useEffect(regenerate, [regenerate]);

  const s = strength(length, sets.length ? sets : ['lower'], plain);
  const toggle = (set: SetName) => setSets((prev) => (prev.includes(set) ? prev.filter((x) => x !== set) : [...prev, set]));

  return (
    <div>
      <ResultStage
        label={tr('Your password')}
        actions={
          <>
            <StageButton primary onClick={regenerate}><RefreshIcon />{tr('Generate new password')}</StageButton>
            <CopyButton variant="button" text={password} label="Copy" disabled={!password} className="!rounded-full !px-5" />
          </>
        }
        footer={tr('Made on your device with a secure random source. Rarvon never sees it.')}
      >
        <p key={round} data-testid="password" dir="ltr" className="tile-pop max-w-full break-all font-mono text-2xl font-medium tracking-wide text-ink sm:text-3xl">
          <Colored value={password} />
        </p>
        <div className="grid w-full max-w-sm gap-1.5">
          <div className="grid grid-cols-4 gap-1" aria-hidden="true">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className="h-1.5 rounded-full transition-colors" style={{ background: n <= s.level ? s.color : 'var(--color-line)' }} />
            ))}
          </div>
          <p className="text-xs font-semibold" style={{ color: s.color }}>{tr(s.label)} · {tr('{n} bits', { n: s.bits })}</p>
        </div>
      </ResultStage>

      <StageSettings>
        <SettingRow label={tr('Length')} htmlFor="pw-length">
          <input id="pw-length" type="range" min={6} max={64} value={length} onChange={(e) => setLength(Number(e.target.value))} className="min-w-32 flex-1 accent-[var(--color-cat-utilities)]" />
          <span className="w-10 rounded-full bg-elevated py-0.5 text-center font-mono text-sm font-semibold">{length}</span>
        </SettingRow>
        <SettingRow label={tr('Characters')}>
          <ToggleChip on={sets.includes('lower')} onChange={() => toggle('lower')}>{tr('Lowercase (a-z)')}</ToggleChip>
          <ToggleChip on={sets.includes('upper')} onChange={() => toggle('upper')}>{tr('Uppercase (A-Z)')}</ToggleChip>
          <ToggleChip on={sets.includes('digits')} onChange={() => toggle('digits')}>{tr('Digits (0-9)')}</ToggleChip>
          <ToggleChip on={sets.includes('symbols')} onChange={() => toggle('symbols')}>{tr('Symbols (!@#…)')}</ToggleChip>
        </SettingRow>
        <SettingRow label={tr('Easier to read')}>
          <ToggleChip on={plain} onChange={setPlain}>{tr('Avoid look-alikes (I l 1 O 0)')}</ToggleChip>
        </SettingRow>
      </StageSettings>
    </div>
  );
}
