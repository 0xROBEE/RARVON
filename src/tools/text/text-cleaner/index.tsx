import { useState } from 'react';
import Button from '../../../components/Button';
import { CopyButton } from '../../../components/tool';

export default function TextCleaner() {
  const [text, setText] = useState('');
  const [options, setOptions] = useState({
    trimLines: true,
    collapseSpaces: true,
    collapseBlankLines: true,
    removeInvisible: true,
  });
  const [output, setOutput] = useState('');

  function clean() {
    let result = text;
    if (options.removeInvisible) {
      result = result.replace(/[\u200B-\u200D\uFEFF]/g, '');
    }
    if (options.trimLines) {
      result = result
        .split('\n')
        .map((l) => l.trim())
        .join('\n');
    }
    if (options.collapseSpaces) {
      result = result.replace(/[ \t]{2,}/g, ' ');
    }
    if (options.collapseBlankLines) {
      result = result.replace(/\n{3,}/g, '\n\n');
    }
    setOutput(result.trim());
  }

  const toggle = (key: keyof typeof options) => setOptions((o) => ({ ...o, [key]: !o[key] }));

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="Paste messy text here…"
        className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm leading-relaxed focus:border-workshop"
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['trimLines', 'Trim line edges'],
          ['collapseSpaces', 'Collapse extra spaces'],
          ['collapseBlankLines', 'Collapse blank lines'],
          ['removeInvisible', 'Remove invisible characters'],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-xs text-ink-2">
            <input type="checkbox" checked={options[key as keyof typeof options]} onChange={() => toggle(key as keyof typeof options)} />
            {label}
          </label>
        ))}
      </div>
      <Button onClick={clean} disabled={!text}>Clean text</Button>
      {output && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-ink-2">Result</span>
            <CopyButton text={output} label="Copy" />
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-paper-dim px-3 py-2 text-sm leading-relaxed">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
