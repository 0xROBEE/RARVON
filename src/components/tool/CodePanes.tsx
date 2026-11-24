import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { CopyButton } from './index';
import { tr } from '../../lib/i18n';

/**
 * The developer tools' look: code-editor panes (a file tab, line numbers,
 * coloured code) side by side, with a status bar underneath. Results update
 * as you type; there is no "run" button.
 */

/** Two editor panes side by side (stacked on phones), with a status bar under them. */
export function DevWorkspace({ children, status, single }: { children: ReactNode; status?: ReactNode; single?: boolean }) {
  return (
    <div className="space-y-2">
      <div className={clsx('grid gap-3', !single && 'lg:grid-cols-2')}>{children}</div>
      {status}
    </div>
  );
}

/** A pane with the editor's tab bar and any content (inputs, lists…). */
export function Pane({ file, tabs, label, actions, children, className }: { file?: string; tabs?: ReactNode; label: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx('flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-paper', className)} aria-label={label}>
      <TabBar tabs={tabs ?? <FileTab name={file ?? ''} />} actions={actions} />
      <div className="flex-1">{children}</div>
    </section>
  );
}

/** One "name  value  Copy" row in a result pane. */
export function ValueRow({ name, value, mono = true, tone }: { name: ReactNode; value: string; mono?: boolean; tone?: 'good' | 'bad' }) {
  return (
    <div className="group flex items-start gap-3 border-b border-line px-3 py-2 last:border-b-0">
      <span className="w-24 shrink-0 pt-0.5 font-mono text-[11px] text-[color:var(--color-cat-developer)]">{name}</span>
      <span dir="ltr" className={clsx('min-w-0 flex-1 break-all text-xs leading-relaxed', mono && 'font-mono', tone === 'good' && 'text-signal', tone === 'bad' && 'text-warn')}>{value}</span>
      <CopyButton text={value} label="Copy" className="shrink-0 opacity-70 group-hover:opacity-100" />
    </div>
  );
}

/** The tab bar above a pane: one "file" tab (or several mode tabs), with actions on the other side. */
function TabBar({ tabs, actions }: { tabs: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex min-h-10 flex-wrap items-stretch border-b border-line bg-elevated">
      <div className="flex items-stretch">{tabs}</div>
      {actions && <div className="ms-auto flex flex-wrap items-center gap-1.5 px-2 py-1.5">{actions}</div>}
    </header>
  );
}

function FileTab({ name, active = true, onClick, icon = true }: { name: string; active?: boolean; onClick?: () => void; icon?: boolean }) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick, role: 'tab', 'aria-selected': active } : {})}
      className={clsx(
        'relative flex items-center gap-1.5 border-e border-line px-3 font-mono text-[11px] transition-colors',
        active ? 'bg-paper text-ink' : 'text-ink-3 hover:text-ink',
      )}
    >
      {icon && <span aria-hidden="true" className="text-[color:var(--color-cat-developer)]">{'{ }'}</span>}
      {name}
      {active && <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 bg-[color:var(--color-cat-developer)]" />}
    </Tag>
  );
}

/** Tabs that switch a tool's mode (Encode / Decode…), drawn as editor tabs. */
export function ModeTabs<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="flex items-stretch">
      {options.map((o) => (
        <FileTab key={o.value} name={o.label} icon={false} active={o.value === value} onClick={() => onChange(o.value)} />
      ))}
    </div>
  );
}

/** A small button for a pane's tab bar. */
export function PaneAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-md border border-line bg-paper px-2 py-1 text-[11px] font-semibold text-ink hover:border-ink">
      {children}
    </button>
  );
}

const lineCount = (s: string) => (s ? s.split('\n').length : 1);

function Gutter({ lines }: { lines: number }) {
  return (
    <div aria-hidden="true" className="select-none border-e border-line bg-elevated/60 px-2 py-2.5 text-end font-mono text-xs leading-relaxed text-ink-3">
      {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
    </div>
  );
}

/** An editable code pane. `wrap` turns long lines into several (for Base64, tokens…) and hides line numbers. */
export function CodeEditor({
  file,
  label,
  value,
  onChange,
  placeholder,
  tabs,
  actions,
  wrap = false,
  minRows = 12,
  open,
}: {
  file?: string;
  /** Accessible name of the text box. */
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Mode tabs instead of the file tab. */
  tabs?: ReactNode;
  actions?: ReactNode;
  wrap?: boolean;
  minRows?: number;
  /** Lets "Open file" read a text file into the pane, for these file types. */
  open?: string;
}) {
  const [pasteFailed, setPasteFailed] = useState(false);
  const rows = Math.max(minRows, lineCount(value));
  const fileInput = useRef<HTMLInputElement>(null);

  async function paste() {
    try {
      onChange(await navigator.clipboard.readText());
    } catch {
      setPasteFailed(true);
      window.setTimeout(() => setPasteFailed(false), 2200);
    }
  }

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-paper transition-colors focus-within:border-[color:var(--color-cat-developer)]" aria-label={label}>
      <TabBar
        tabs={tabs ?? <FileTab name={file ?? 'input'} />}
        actions={
          <>
            {actions}
            <PaneAction onClick={() => void paste()}>{pasteFailed ? tr('Press Ctrl+V') : tr('Paste')}</PaneAction>
            {open && (
              <>
                <PaneAction onClick={() => fileInput.current?.click()}>{tr('Open file')}</PaneAction>
                <input
                  ref={fileInput}
                  type="file"
                  accept={open}
                  className="sr-only"
                  tabIndex={-1}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) onChange(await f.text());
                    e.target.value = '';
                  }}
                />
              </>
            )}
            {value && <PaneAction onClick={() => onChange('')}>{tr('Clear')}</PaneAction>}
          </>
        }
      />
      <div className={clsx('flex max-h-[30rem] flex-1 overflow-auto', wrap && 'min-h-[10rem]')}>
        {!wrap && <Gutter lines={rows} />}
        <textarea
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap={wrap ? 'soft' : 'off'}
          rows={wrap ? Math.max(6, minRows / 2) : rows}
          dir="ltr"
          className={clsx(
            'code-field block min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink-3',
            wrap ? 'break-all' : 'overflow-x-auto overflow-y-hidden whitespace-pre',
          )}
        />
      </div>
    </section>
  );
}

/** A read-only code pane with Copy (and Download) in its tab bar. */
export function CodeView({
  file,
  label,
  text,
  children,
  highlight,
  wrap = false,
  minRows = 12,
  empty,
  actions,
  download,
}: {
  file: string;
  label: string;
  /** The text to show, copy and download. */
  text: string;
  /** Custom content instead of the text (it is still what Copy copies). */
  children?: ReactNode;
  highlight?: 'json';
  wrap?: boolean;
  minRows?: number;
  empty?: string;
  actions?: ReactNode;
  /** Offer the text as a file with this name. */
  download?: string;
}) {
  const url = useMemo(() => (text && download ? URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })) : null), [text, download]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const rows = Math.max(minRows, lineCount(text));

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-paper" aria-label={label}>
      <TabBar
        tabs={<FileTab name={file} />}
        actions={
          <>
            {actions}
            {url && <a href={url} download={download} className="rounded-md border border-line bg-paper px-2 py-1 text-[11px] font-semibold text-ink hover:border-ink">{tr('Download')}</a>}
            <CopyButton text={text} label="Copy" variant="button" disabled={!text} className="!min-h-0 !px-2.5 !py-1 !text-[11px] !font-semibold" />
          </>
        }
      />
      {children ?? (text ? (
        <div className="flex max-h-[30rem] flex-1 overflow-auto">
          {!wrap && <Gutter lines={rows} />}
          <pre dir="ltr" key={text ? 'full' : 'empty'} className={clsx('fade-in min-w-0 flex-1 px-3 py-2.5 font-mono text-xs leading-relaxed', wrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre')}>
            {highlight === 'json' ? <JsonCode text={text} /> : text}
          </pre>
        </div>
      ) : (
        <p className="grid min-h-[14rem] flex-1 place-items-center px-6 text-center text-xs text-ink-3">{empty ?? tr('The result appears here as you type.')}</p>
      ))}
    </section>
  );
}

/** The bar under the panes: whether the input is valid, and a few facts about it. */
export function StatusBar({ state, message, items = [], right }: { state?: 'ok' | 'error' | 'idle'; message?: ReactNode; items?: ReactNode[]; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line bg-elevated px-3 py-1.5 font-mono text-[11px] text-ink-3" role="status">
      {message && (
        <span className={clsx('inline-flex items-center gap-1.5 font-sans font-semibold', state === 'ok' && 'text-signal', state === 'error' && 'text-warn')}>
          <span aria-hidden="true" className={clsx('h-2 w-2 rounded-full', state === 'ok' ? 'bg-signal' : state === 'error' ? 'bg-warn' : 'bg-ink-3')} />
          {message}
        </span>
      )}
      {items.map((it, i) => <span key={i}>{it}</span>)}
      {right && <span className="ms-auto flex flex-wrap items-center gap-2 font-sans">{right}</span>}
    </div>
  );
}

/** A small select for the status bar (indent, unit…). */
export function StatusSelect<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[11px] text-ink-3">
      {label}
      <select
        value={String(value)}
        onChange={(e) => {
          const picked = options.find((o) => String(o.value) === e.target.value);
          if (picked) onChange(picked.value);
        }}
        className="rounded border border-line bg-paper px-1.5 py-0.5 text-[11px] text-ink"
      >
        {options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    </label>
  );
}

const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

/** JSON with keys, strings, numbers and true/false/null in different colours. */
export function JsonCode({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    if (m[1] && m[2]) parts.push(<span key={k++} className="text-[color:var(--color-cat-developer)]">{m[1]}</span>, m[2]);
    else if (m[1]) parts.push(<span key={k++} className="text-signal">{m[1]}</span>);
    else if (m[3]) parts.push(<span key={k++} className="text-workshop">{m[3]}</span>);
    else parts.push(<span key={k++} className="text-warn">{m[4]}</span>);
    last = at + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** "5 lines · 58 bytes" for status bars. */
export function sizeFacts(s: string) {
  return [
    tr('{n} lines', { n: lineCount(s).toLocaleString() }),
    tr('{n} bytes', { n: new TextEncoder().encode(s).length.toLocaleString() }),
  ];
}
