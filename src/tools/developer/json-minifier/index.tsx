import { useMemo, useState } from 'react';
import { CodeEditor, CodeView, DevWorkspace, StatusBar } from '../../../components/tool/CodePanes';
import { jsonError } from '../../../lib/jsonError';
import { tr } from '../../../lib/i18n';

export default function JsonMinifier() {
  const [input, setInput] = useState('');

  const result = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return { output: JSON.stringify(JSON.parse(input)) };
    } catch (e) {
      return { error: jsonError(e, input) };
    }
  }, [input]);

  const output = result?.output ?? '';
  const bytes = (s: string) => new TextEncoder().encode(s).length;
  const saved = output ? Math.max(0, Math.round((1 - bytes(output) / bytes(input)) * 100)) : 0;

  return (
    <DevWorkspace
      status={
        <StatusBar
          state={!result ? 'idle' : 'error' in result ? 'error' : 'ok'}
          message={!result ? tr('Waiting for JSON') : 'error' in result ? result.error : tr('Valid JSON')}
          items={output ? [
            tr('{a} → {b} bytes', { a: bytes(input).toLocaleString(), b: bytes(output).toLocaleString() }),
            tr('{n}% smaller', { n: saved }),
          ] : []}
        />
      }
    >
      <CodeEditor file="input.json" label={tr('Paste JSON')} value={input} onChange={setInput} placeholder={tr('{"example": true, "values": [1, 2, 3]}')} open=".json,.txt,application/json" />
      <CodeView file="minified.json" label={tr('Minified JSON')} text={output} highlight="json" wrap download="minified.json" />
    </DevWorkspace>
  );
}
