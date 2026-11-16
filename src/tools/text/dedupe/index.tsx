import { useState } from 'react';
import Button from '../../../components/Button';
import { CopyButton } from '../../../components/tool';
import { tr } from '../../../lib/i18n';

export default function DedupeTool() {
  const [text, setText] = useState('');
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [trim, setTrim] = useState(true);
  const [output, setOutput] = useState('');
  const [removed, setRemoved] = useState(0);

  function run() {
    const lines = text.split('\n');
    const seen = new Set<string>();
    const result: string[] = [];
    for (const line of lines) {
      const candidate = trim ? line.trim() : line;
      const key = ignoreCase ? candidate.toLowerCase() : candidate;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(line);
      }
    }
    setOutput(result.join('\n'));
    setRemoved(lines.length - result.length);
  }

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={tr("One item per line…")}
        className="w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-xs leading-relaxed focus:border-workshop"
      />
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs text-ink-2">
          <input type="checkbox" checked={ignoreCase} onChange={(e) => setIgnoreCase(e.target.checked)} />
          {tr("Ignore case")}
        </label>
        <label className="flex items-center gap-2 text-xs text-ink-2">
          <input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} />
          {tr("Ignore leading/trailing whitespace")}
        </label>
      </div>
      <Button onClick={run} disabled={!text}>{tr("Remove duplicates")}</Button>
      {output !== '' && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-ink-2">
              {tr(removed === 1 ? '{n} duplicate line removed' : '{n} duplicate lines removed', { n: removed })}
            </span>
            <CopyButton text={output} label={tr("Copy")} />
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-paper-dim px-3 py-2 font-mono text-xs leading-relaxed">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
