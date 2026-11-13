import { useState } from 'react';

const converters: Record<string, (s: string) => string> = {
  UPPERCASE: (s) => s.toUpperCase(),
  lowercase: (s) => s.toLowerCase(),
  // Unicode-aware (\p{L}/\p{N}) so accented and non-Latin letters are words too.
  'Title Case': (s) => s.toLowerCase().replace(/(^|[\s\-–—/(["“])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase()),
  'Sentence case': (s) =>
    s.toLowerCase().replace(/(^\s*|[.!?؟。]\s+)(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase()),
  camelCase: (s) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+(\p{L}|\p{N})/gu, (_, c) => c.toUpperCase())
      .replace(/[^\p{L}\p{N}]+/gu, ''),
  'snake_case': (s) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '_')
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
