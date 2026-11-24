import { useMemo, useState } from 'react';
import { ToggleChip } from '../../../components/tool/TextPanes';
import { CodeEditor, CodeView, DevWorkspace, ModeTabs, StatusBar } from '../../../components/tool/CodePanes';
import { tr } from '../../../lib/i18n';

type Mode = 'encode' | 'decode';

export default function UrlEncodeTool() {
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  // Whole URL: keep : / ? & = # as they are, so the link still works.
  const [wholeUrl, setWholeUrl] = useState(false);

  const result = useMemo(() => {
    if (!input) return null;
    try {
      if (mode === 'encode') return { output: wholeUrl ? encodeURI(input) : encodeURIComponent(input) };
      return { output: wholeUrl ? decodeURI(input) : decodeURIComponent(input) };
    } catch {
      return { error: tr("That doesn't look like validly percent-encoded text.") };
    }
  }, [mode, input, wholeUrl]);

  const output = result?.output ?? '';
  return (
    <DevWorkspace
      status={
        <StatusBar
          state={!result ? 'idle' : 'error' in result ? 'error' : 'ok'}
          message={!result ? (mode === 'encode' ? tr('Type text or a link to encode') : tr('Paste encoded text to decode')) : 'error' in result ? result.error : mode === 'encode' ? tr('Encoded') : tr('Decoded')}
          items={output ? [tr('{n} characters', { n: output.length.toLocaleString() })] : []}
          right={<ToggleChip on={wholeUrl} onChange={setWholeUrl}>{tr('Whole URL (keep : / ? & =)')}</ToggleChip>}
        />
      }
    >
      <CodeEditor
        tabs={<ModeTabs<Mode> label={tr('What to do')} value={mode} onChange={setMode} options={[{ value: 'encode', label: tr('Encode') }, { value: 'decode', label: tr('Decode') }]} />}
        label={mode === 'encode' ? tr('Text to encode') : tr('Text to decode')}
        value={input}
        onChange={setInput}
        wrap
        placeholder={tr('https://example.com/search?q=hello world')}
      />
      <CodeView file={mode === 'encode' ? 'encoded.txt' : 'decoded.txt'} label={tr('Result')} text={output} wrap />
    </DevWorkspace>
  );
}
