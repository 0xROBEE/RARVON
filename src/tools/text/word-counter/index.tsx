import { useMemo, useState } from 'react';

export default function WordCounter() {
  const [text, setText] = useState('');

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const sentences = text.trim() ? (text.match(/[.!?؟。！？]+(\s|$)/g)?.length ?? (text.trim() ? 1 : 0)) : 0;
    const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter((p) => p.trim()).length : 0;
    const readingMinutes = words ? Math.max(1, Math.round(words / 200)) : 0;
    return { words, characters, charactersNoSpaces, sentences, paragraphs, readingMinutes };
  }, [text]);

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder="Start typing or paste your text here…"
        className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm leading-relaxed focus:border-workshop"
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ['Words', stats.words],
          ['Characters', stats.characters],
          ['Characters (no spaces)', stats.charactersNoSpaces],
          ['Sentences', stats.sentences],
          ['Paragraphs', stats.paragraphs],
          ['Reading time', `${stats.readingMinutes} min`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-line bg-paper-dim p-3">
            <p className="text-xs text-ink/50">{label}</p>
            <p className="font-display text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
