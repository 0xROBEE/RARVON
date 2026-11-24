import { useMemo, useState } from 'react';
import { ToggleChip } from '../../../components/tool/TextPanes';
import { CodeEditor, DevWorkspace, Pane, StatusBar } from '../../../components/tool/CodePanes';
import { tr } from '../../../lib/i18n';

const FLAG_OPTIONS = [
  { flag: 'g', label: 'Global' },
  { flag: 'i', label: 'Ignore case' },
  { flag: 'm', label: 'Multiline' },
  { flag: 's', label: 'Dot matches newline' },
] as const;

export default function RegexTester() {
  const [pattern, setPattern] = useState('\\b[\\w.-]+@[\\w.-]+\\.\\w+\\b');
  const [flags, setFlags] = useState<Set<string>>(new Set(['g']));
  const [text, setText] = useState('Contact us at hello@example.com or support@example.org for help.');
  const flagString = ['g', 'i', 'm', 's'].filter((f) => flags.has(f)).join('');

  function toggleFlag(f: string) {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }

  const { matches, error } = useMemo(() => {
    let re: RegExp;
    try {
      re = new RegExp(pattern, flagString.includes('g') ? flagString : flagString + 'g');
    } catch (e) {
      return { matches: [] as RegExpExecArray[], error: e instanceof Error ? e.message : tr('Invalid regular expression.') };
    }
    const found: RegExpExecArray[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null && found.length < 5000) {
      found.push(m);
      if (m[0] === '') re.lastIndex++;
      if (!flagString.includes('g')) break;
    }
    return { matches: found, error: null };
  }, [pattern, flagString, text]);

  const highlighted = useMemo(() => {
    const parts: { text: string; match?: number }[] = [];
    let cursor = 0;
    matches.forEach((m, i) => {
      if (m.index > cursor) parts.push({ text: text.slice(cursor, m.index) });
      parts.push({ text: m[0], match: i });
      cursor = m.index + m[0].length;
    });
    if (cursor < text.length) parts.push({ text: text.slice(cursor) });
    return parts;
  }, [matches, text]);

  const withGroups = matches.some((m) => m.length > 1);

  return (
    <div className="space-y-3">
      <Pane file="pattern" label={tr('Pattern')}>
        <div className="grid gap-3 p-3">
          <label className="flex items-center gap-1 rounded-lg border border-line bg-elevated px-3 py-2.5 font-mono text-base focus-within:border-[color:var(--color-cat-developer)]" dir="ltr">
            <span className="text-ink-3">/</span>
            <input aria-label={tr('Pattern')} value={pattern} onChange={(e) => setPattern(e.target.value)} spellCheck={false} className="code-field w-full bg-transparent text-ink outline-none" />
            <span className="text-[color:var(--color-cat-developer)]">/{flagString}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {FLAG_OPTIONS.map((f) => (
              <ToggleChip key={f.flag} on={flags.has(f.flag)} onChange={() => toggleFlag(f.flag)}>
                {tr(f.label)} <span className="font-mono opacity-70">{f.flag}</span>
              </ToggleChip>
            ))}
          </div>
        </div>
      </Pane>

      <DevWorkspace
        status={
          <StatusBar
            state={error ? 'error' : matches.length ? 'ok' : 'idle'}
            message={error ?? tr(matches.length === 1 ? '{n} match' : '{n} matches', { n: matches.length })}
            items={withGroups && !error ? [tr('Capture groups')] : []}
          />
        }
      >
        <CodeEditor file="test.txt" label={tr('Test text')} value={text} onChange={setText} wrap minRows={10} />
        <Pane file="matches" label={tr('Matches')}>
          {error ? (
            <p role="alert" className="px-3 py-4 font-mono text-xs text-warn">{error}</p>
          ) : (
            <div className="fade-in">
              <pre dir="ltr" className="whitespace-pre-wrap break-all px-3 py-2.5 font-mono text-xs leading-relaxed">
                {highlighted.map((p, i) =>
                  p.match !== undefined ? <mark key={i} className="rounded bg-[color:color-mix(in_srgb,var(--color-cat-developer)_25%,transparent)] px-0.5 text-ink">{p.text}</mark> : <span key={i}>{p.text}</span>,
                )}
              </pre>
              {withGroups && (
                <div className="border-t border-line">
                  {matches.slice(0, 200).map((m, i) => (
                    <div key={i} className="flex flex-wrap gap-x-3 gap-y-1 border-b border-line px-3 py-1.5 font-mono text-[11px] last:border-b-0" dir="ltr">
                      <span className="text-ink-3">#{i + 1}</span>
                      {Array.from(m).slice(1).map((g, gi) => (
                        <span key={gi}><span className="text-[color:var(--color-cat-developer)]">${gi + 1}</span> {g ?? <span className="text-ink-3">{tr('undefined')}</span>}</span>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Pane>
      </DevWorkspace>
    </div>
  );
}
