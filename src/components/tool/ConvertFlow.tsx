import type { ReactNode } from 'react';
import clsx from 'clsx';
import DownloadButton from '../DownloadButton';
import { tr } from '../../lib/i18n';

/**
 * The "From → To" layout shared by the converters: the file you have on one
 * side, the file you will get on the other, and an arrow between them that
 * moves while the conversion runs. When it is done, the right card becomes
 * the result with its Download button.
 */

export interface FlowSide {
  /** A small picture, waveform or icon. */
  preview: ReactNode;
  name: string;
  /** e.g. "497 KB" or "about 140 KB". */
  detail: ReactNode;
  format: string;
}

export function ConvertFlow({
  from,
  to,
  state,
  onRemove,
  result,
}: {
  from: FlowSide;
  to: FlowSide;
  state: 'idle' | 'busy' | 'done';
  onRemove: () => void;
  result?: { url: string; filename: string };
}) {
  return (
    <div className="grid items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)]" data-testid="convert-flow">
      <FlowCard side={from} label={tr('From')} action={
        <button onClick={onRemove} className="text-xs font-medium text-workshop hover:underline">{tr('Remove')}</button>
      } />

      <div className="flex items-center justify-center py-1 sm:py-0" aria-hidden="true">
        <span className={clsx('flow-arrow grid h-10 w-10 place-items-center rounded-full border transition-colors', state === 'done' ? 'border-signal bg-signal-dim text-signal' : 'border-workshop/40 bg-workshop-dim text-workshop', state === 'busy' && 'flow-arrow-busy')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={state === 'done' ? undefined : 'rotate-90 sm:rotate-0 rtl:sm:rotate-180'}>
            {state === 'done' ? <path d="M5 12l5 5L20 7" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
          </svg>
        </span>
      </div>

      <FlowCard
        side={to}
        label={state === 'done' ? tr('Ready') : tr('To')}
        target
        state={state}
        action={result && state === 'done' ? <DownloadButton url={result.url} filename={result.filename} label={tr('Download')} /> : null}
      />
    </div>
  );
}

function FlowCard({ side, label, action, target, state }: { side: FlowSide; label: string; action?: ReactNode; target?: boolean; state?: 'idle' | 'busy' | 'done' }) {
  const done = state === 'done';
  return (
    <div
      role={target && done ? 'group' : undefined}
      aria-label={target && done ? tr('Result') : undefined}
      className={clsx(
        'flex min-w-0 flex-col gap-3 rounded-xl border p-3 transition-all duration-300',
        !target && 'border-line bg-elevated',
        target && !done && 'border-dashed border-workshop/50 bg-paper',
        target && done && 'flow-done border-signal/60 bg-signal-dim',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={clsx('relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-paper-dim', target && !done && 'opacity-80', state === 'busy' && 'flow-shimmer')}>
          {side.preview}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">{label}</p>
          <p className="truncate text-sm font-medium" title={side.name}>{side.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              key={side.format}
              className={clsx('flow-pill rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold', target ? (done ? 'border-signal/50 text-signal' : 'border-workshop/50 text-workshop') : 'border-line text-ink-2')}
            >
              {side.format}
            </span>
            <span className="text-xs text-ink-2">{side.detail}</span>
          </div>
        </div>
      </div>
      {action && <div className="flex justify-end">{action}</div>}
    </div>
  );
}

/** Pick the output format: a row of pills, each with a short "what is it for". */
export function FormatPills<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T | null;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={tr('Convert to')} className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.label}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={clsx(
              'flex min-h-11 flex-col items-start justify-center rounded-lg border px-3 py-1.5 text-start transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[7.5rem]',
              on ? 'border-workshop bg-workshop-dim shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-workshop)_15%,transparent)]' : 'border-line bg-paper hover:border-ink',
            )}
          >
            <span className={clsx('text-sm font-semibold', on ? 'text-workshop' : 'text-ink')}>{o.label}</span>
            {o.hint && <span className="text-[11px] leading-tight text-ink-3">{tr(o.hint)}</span>}
          </button>
        );
      })}
    </div>
  );
}
