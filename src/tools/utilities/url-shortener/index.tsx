import { useState } from 'react';
import { ResultStage, StageButton } from '../../../components/tool/Stage';
import { tr } from '../../../lib/i18n';

// This tool is intentionally non-functional. A real short link needs a
// server to remember where each code points, which this project doesn't
// have yet. The form below is the real interface and calls a single
// placeholder function — wire `createShortLink` up to a backend endpoint
// (e.g. POST /api/links) to make this tool live without touching the UI.

async function createShortLink(_longUrl: string): Promise<{ shortUrl: string }> {
  throw new Error(tr('No backend is connected yet.'));
}

export default function UrlShortenerTool() {
  const [longUrl, setLongUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await createShortLink(longUrl);
    } catch {
      setNotice(tr('Short links need a backend, which isn’t connected in this free build yet.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block rounded-2xl border border-line bg-paper p-3 focus-within:border-[color:var(--color-cat-utilities)]">
        <span className="mb-1.5 block text-xs font-semibold text-ink-2">{tr('Long URL')}</span>
        <input
          value={longUrl}
          onChange={(e) => setLongUrl(e.target.value)}
          placeholder={tr('https://example.com/a/very/long/path')}
          className="code-field w-full bg-transparent text-lg text-ink placeholder:text-ink-3"
        />
      </label>
      <ResultStage
        label={tr('Short link')}
        actions={<StageButton primary onClick={() => void handleSubmit()} disabled={!longUrl.trim() || submitting}>{submitting ? tr('Shortening…') : tr('Shorten URL')}</StageButton>}
      >
        <p className="font-mono text-xl text-ink-3">rarvon.com/<span className="text-[color:var(--color-cat-utilities)]">······</span></p>
        {notice && <p className="max-w-md text-xs text-ink-2">{notice}</p>}
      </ResultStage>
    </div>
  );
}
