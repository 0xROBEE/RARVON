import { useMemo, useState } from 'react';
import { CodeEditor, CodeView, DevWorkspace, StatusBar, StatusSelect, sizeFacts } from '../../../components/tool/CodePanes';
import { jsonError } from '../../../lib/jsonError';
import { tr } from '../../../lib/i18n';

type Indent = 2 | 4 | 0;

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [indent, setIndent] = useState<Indent>(2);

  const result = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return { output: JSON.stringify(JSON.parse(input), null, indent === 0 ? '\t' : indent) };
    } catch (e) {
      return { error: jsonError(e, input) };
    }
  }, [input, indent]);

  const output = result?.output ?? '';

  return (
    <DevWorkspace
      status={
        <StatusBar
          state={!result ? 'idle' : 'error' in result ? 'error' : 'ok'}
          message={!result ? tr('Waiting for JSON') : 'error' in result ? result.error : tr('Valid JSON')}
          items={output ? sizeFacts(output) : []}
          right={
            <StatusSelect<Indent>
              label={tr('Indent')}
              value={indent}
              onChange={setIndent}
              options={[{ value: 2, label: tr('2 spaces') }, { value: 4, label: tr('4 spaces') }, { value: 0, label: tr('Tab') }]}
            />
          }
        />
      }
    >
      <CodeEditor file="input.json" label={tr('Paste JSON')} value={input} onChange={setInput} placeholder={tr('{"example": true, "values": [1, 2, 3]}')} open=".json,.txt,application/json" />
      <CodeView file="formatted.json" label={tr('Formatted JSON')} text={output} highlight="json" download="formatted.json" />
    </DevWorkspace>
  );
}
