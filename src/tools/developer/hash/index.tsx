import { useEffect, useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import { CodeEditor, DevWorkspace, ModeTabs, Pane, StatusBar, ValueRow } from '../../../components/tool/CodePanes';
import { formatBytes } from '../../../lib/imageUtils';
import { tr } from '../../../lib/i18n';

const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const;
type Mode = 'text' | 'file';

async function hashAll(data: BufferSource) {
  const out: Record<string, string> = {};
  for (const algo of algorithms) {
    const digest = await crypto.subtle.digest(algo, data);
    out[algo] = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return out;
}

export default function HashTool() {
  const [mode, setMode] = useState<Mode>('text');
  const [input, setInput] = useState('');
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [expected, setExpected] = useState('');

  // Text hashes update as you type.
  useEffect(() => {
    if (mode !== 'text') return;
    let live = true;
    if (!input) {
      setResults({});
      return;
    }
    void hashAll(new TextEncoder().encode(input)).then((r) => { if (live) setResults(r); });
    return () => { live = false; };
  }, [mode, input]);

  async function hashFile(files: File[]) {
    const f = files[0];
    setFile({ name: f.name, size: f.size });
    try {
      setResults(await hashAll(await f.arrayBuffer()));
      setError(null);
    } catch {
      setError(tr('Could not hash that file.'));
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setResults({});
    setFile(null);
    setError(null);
  }

  const wanted = expected.trim().toLowerCase();
  const match = wanted ? algorithms.find((a) => results[a] === wanted) : undefined;
  const has = Object.keys(results).length > 0;
  const tabs = <ModeTabs<Mode> label={tr('What to hash')} value={mode} onChange={switchMode} options={[{ value: 'text', label: tr('Text') }, { value: 'file', label: tr('File') }]} />;

  return (
    <DevWorkspace
      status={
        <StatusBar
          state={error ? 'error' : wanted && has ? (match ? 'ok' : 'error') : has ? 'ok' : 'idle'}
          message={error ?? (wanted && has ? (match ? tr('Matches the {algo} hash', { algo: match }) : tr('No match')) : has ? tr('Hashed') : mode === 'text' ? tr('Type or paste text') : tr('Choose a file'))}
          items={file && mode === 'file' ? [`${file.name} · ${formatBytes(file.size)}`] : []}
        />
      }
    >
      {mode === 'text' ? (
        <CodeEditor tabs={tabs} label={tr('Text to hash')} value={input} onChange={setInput} wrap />
      ) : (
        <Pane tabs={tabs} label={tr('File to hash')}>
          <div className="p-3"><FileDropzone onFiles={hashFile} hint={tr('Any file type; it stays on your device')} /></div>
        </Pane>
      )}
      <Pane file="hashes.txt" label={tr('Hashes')}>
        {has ? (
          <div className="fade-in">
            {algorithms.map((a) => <ValueRow key={a} name={a} value={results[a]} tone={match === a ? 'good' : undefined} />)}
          </div>
        ) : (
          <p className="grid min-h-[11rem] place-items-center px-6 text-center text-xs text-ink-3">{tr('The hashes appear here.')}</p>
        )}
        <label className="flex items-center gap-2 border-t border-line bg-elevated px-3 py-2 text-[11px] text-ink-3">
          {tr('Check against')}
          <input value={expected} onChange={(e) => setExpected(e.target.value)} placeholder={tr('Paste a hash to compare')} dir="ltr" spellCheck={false} className="code-field min-w-0 flex-1 rounded border border-line bg-paper px-2 py-1 font-mono text-[11px] text-ink focus:border-[color:var(--color-cat-developer)]" />
        </label>
      </Pane>
    </DevWorkspace>
  );
}
