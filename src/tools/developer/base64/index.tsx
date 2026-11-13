import { useState } from 'react';
import Button from '../../../components/Button';
import ErrorMessage from '../../../components/ErrorMessage';
import FileDropzone from '../../../components/FileDropzone';
import DownloadButton from '../../../components/DownloadButton';

export default function Base64Tool() {
  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fileResult, setFileResult] = useState<{ url: string; name: string } | null>(null);

  function encode() {
    try {
      setOutput(btoa(unescape(encodeURIComponent(input))));
      setError(null);
    } catch {
      setError('Could not encode this text.');
    }
  }

  function decode() {
    try {
      setOutput(decodeURIComponent(escape(atob(input.trim()))));
      setError(null);
    } catch {
      setOutput('');
      setError("That doesn't look like valid Base64.");
    }
  }

  function handleFile(files: File[]) {
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // data:...;base64,XXXX
      const base64 = result.split(',')[1] ?? '';
      const blob = new Blob([base64], { type: 'text/plain' });
      setFileResult({ url: URL.createObjectURL(blob), name: `${file.name}.base64.txt` });
      setError(null);
    };
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-md border border-line bg-paper-dim p-1 text-xs font-medium">
        {(['text', 'file'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded px-3 py-1.5 capitalize transition-colors ${mode === m ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'}`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'text' ? (
        <>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder="Text or Base64 to convert"
            className="w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-xs leading-relaxed focus:border-workshop"
          />
          <div className="flex gap-2">
            <Button onClick={encode} disabled={!input}>Encode</Button>
            <Button variant="secondary" onClick={decode} disabled={!input}>Decode</Button>
          </div>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {output && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-ink/60">Result</span>
                <button onClick={() => navigator.clipboard.writeText(output)} className="text-xs font-medium text-workshop hover:underline">
                  Copy
                </button>
              </div>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md border border-line bg-paper-dim px-3 py-2 font-mono text-xs leading-relaxed">
                {output}
              </pre>
            </div>
          )}
        </>
      ) : (
        <>
          <FileDropzone onFiles={handleFile} hint="Any file type" />
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {fileResult && <DownloadButton url={fileResult.url} filename={fileResult.name} label="Download .base64.txt" />}
        </>
      )}
    </div>
  );
}
