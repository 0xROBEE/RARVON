import { useMemo, useState } from 'react';
import Button from '../../../components/Button';

const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

function generate(length: number, sets: (keyof typeof SETS)[]): string {
  const pool = sets.map((s) => SETS[s]).join('');
  if (!pool) return '';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => pool[b % pool.length]).join('');
}

function estimateStrength(length: number, sets: (keyof typeof SETS)[]) {
  const poolSize = sets.reduce((sum, s) => sum + SETS[s].length, 0);
  const bits = poolSize > 0 ? Math.log2(poolSize) * length : 0;
  if (bits < 40) return { label: 'Weak', color: 'bg-warn' };
  if (bits < 70) return { label: 'Okay', color: 'bg-workshop' };
  return { label: 'Strong', color: 'bg-signal' };
}

export default function PasswordTool() {
  const [length, setLength] = useState(20);
  const [sets, setSets] = useState<(keyof typeof SETS)[]>(['lower', 'upper', 'digits', 'symbols']);
  const [password, setPassword] = useState(() => generate(20, ['lower', 'upper', 'digits', 'symbols']));

  const strength = useMemo(() => estimateStrength(length, sets), [length, sets]);

  function toggle(set: keyof typeof SETS) {
    setSets((s) => (s.includes(set) ? s.filter((x) => x !== set) : [...s, set]));
  }

  function regenerate() {
    setPassword(generate(length, sets.length ? sets : ['lower']));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-line bg-paper-dim p-4">
        <p className="break-all font-mono text-lg">{password || '—'}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-dim">
          <div className={`h-full rounded-full ${strength.color}`} style={{ width: `${Math.min(100, (length / 32) * 100)}%` }} />
        </div>
        <span className="text-xs font-medium text-ink/60">{strength.label}</span>
      </div>

      <label className="flex items-center gap-3 text-xs text-ink/60">
        Length
        <input type="range" min={6} max={64} value={length} onChange={(e) => setLength(Number(e.target.value))} className="flex-1" />
        <span className="w-6 text-right font-mono">{length}</span>
      </label>

      <div className="grid grid-cols-2 gap-2">
        {[
          ['lower', 'Lowercase (a-z)'],
          ['upper', 'Uppercase (A-Z)'],
          ['digits', 'Digits (0-9)'],
          ['symbols', 'Symbols (!@#…)'],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-xs text-ink/60">
            <input type="checkbox" checked={sets.includes(key as keyof typeof SETS)} onChange={() => toggle(key as keyof typeof SETS)} />
            {label}
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={regenerate}>Generate new password</Button>
        <Button variant="secondary" onClick={() => navigator.clipboard.writeText(password)} disabled={!password}>
          Copy
        </Button>
      </div>
    </div>
  );
}
