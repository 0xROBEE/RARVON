import { useState } from 'react';

const converters: Record<string, (s: string) => string> = {
  UPPERCASE: (s) => s.toUpperCase(),
  lowercase: (s) => s.toLowerCase(),
  'Title Case': (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()),
  'Sentence case': (s) =>
    s.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (m) => m.toUpperCase()),
  camelCase: (s) =>
    s
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()),
  'snake_case': (s) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, ''),
};

export default function CaseConverter() {
  const [text, setText] = useState('');

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Type or paste text here…"
        className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm leading-relaxed focus:border-workshop"
      />
      <div className="space-y-2">
        {Object.entries(converters).map(([label, fn]) => {
          const result = text ? fn(text) : '';
          return (
            <div key={label} className="rounded-md border border-line bg-paper-dim p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-ink/50">{label}</span>
                {result && (
                  <button onClick={() => navigator.clipboard.writeText(result)} className="text-xs font-medium text-workshop hover:underline">
                    Copy
                  </button>
                )}
              </div>
              <p className="min-h-5 break-words text-sm">{result || <span className="text-ink/30">—</span>}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
