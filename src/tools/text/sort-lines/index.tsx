import { useState } from 'react';
import Button from '../../../components/Button';

type Mode = 'alpha' | 'alpha-desc' | 'numeric' | 'length' | 'random';

export default function SortLinesTool() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('alpha');
  const [removeEmpty, setRemoveEmpty] = useState(true);
  const [output, setOutput] = useState('');

  function run() {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    let lines = text.split('\n');
    if (removeEmpty) lines = lines.filter((l) => l.trim() !== '');
    switch (mode) {
      case 'alpha':
        lines.sort(collator.compare);
        break;
      case 'alpha-desc':
        lines.sort((a, b) => collator.compare(b, a));
        break;
      case 'numeric':
        lines.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
        break;
      case 'length':
        lines.sort((a, b) => a.length - b.length);
        break;
      case 'random':
        for (let i = lines.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [lines[i], lines[j]] = [lines[j], lines[i]];
        }
        break;
    }
    setOutput(lines.join('\n'));
  }

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={'One item per line…'}
        className="w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-xs leading-relaxed focus:border-workshop"
      />
      <div className="flex flex-wrap items-center gap-3">
        <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="rounded-md border border-line bg-paper px-2 py-2 text-xs">
          <option value="alpha">A → Z</option>
          <option value="alpha-desc">Z → A</option>
          <option value="numeric">Numeric</option>
          <option value="length">By length</option>
          <option value="random">Shuffle</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-ink/60">
          <input type="checkbox" checked={removeEmpty} onChange={(e) => setRemoveEmpty(e.target.checked)} />
          Remove empty lines
        </label>
        <Button onClick={run} disabled={!text}>Sort</Button>
      </div>
      {output !== '' && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-ink/60">Result</span>
            <button onClick={() => navigator.clipboard.writeText(output)} className="text-xs font-medium text-workshop hover:underline">
              Copy
            </button>
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-paper-dim px-3 py-2 font-mono text-xs leading-relaxed">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
