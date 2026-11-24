import type { ReactNode } from 'react';
import clsx from 'clsx';

/**
 * The utility tools' look: the result is the star, big in the middle of a
 * stage card, with its main actions under it and the settings below as
 * pills. Changing a setting updates the result straight away.
 */

/** The big card that shows the result. */
export function ResultStage({ label, children, actions, footer }: { label: string; children: ReactNode; actions?: ReactNode; footer?: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="overflow-hidden rounded-2xl border bg-elevated"
      style={{ borderColor: 'color-mix(in srgb, var(--color-cat-utilities) 35%, var(--color-line))' }}
    >
      <div className="grid min-h-[11rem] place-items-center gap-5 px-5 py-8 text-center sm:px-8">
        {children}
        {actions && <div className="flex flex-wrap justify-center gap-2">{actions}</div>}
      </div>
      {footer && <div className="border-t border-line bg-paper px-4 py-2 text-center text-xs text-ink-3">{footer}</div>}
    </section>
  );
}

/** A round stage button; `primary` is the main action, in the utilities colour. */
export function StageButton({ children, onClick, primary, disabled, label }: { children: ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={clsx(
        'inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40',
        primary ? 'bg-[color:var(--color-cat-utilities)] text-paper hover:brightness-110' : 'border border-line bg-paper text-ink hover:border-ink',
      )}
    >
      {children}
    </button>
  );
}

/** The settings under the stage: rows of labels and pills. */
export function StageSettings({ children }: { children: ReactNode }) {
  return <div className="mt-3 grid gap-3 rounded-2xl border border-line bg-paper p-4">{children}</div>;
}

export function SettingRow({ label, children, htmlFor }: { label: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <label htmlFor={htmlFor} className="w-full shrink-0 text-xs font-semibold text-ink-2 sm:w-24">{label}</label>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** A compact number box for settings. */
export function NumberPill({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-line bg-elevated py-1 pe-1 ps-3 text-xs text-ink-2 focus-within:border-[color:var(--color-cat-utilities)]">
      {label}
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
        className="code-field w-20 rounded-full bg-paper px-2.5 py-1 text-end font-mono text-sm text-ink"
      />
    </label>
  );
}

export const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5" />
  </svg>
);
