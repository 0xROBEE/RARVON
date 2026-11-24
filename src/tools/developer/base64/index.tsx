import { useEffect, useMemo, useState } from 'react';
import FileDropzone from '../../../components/FileDropzone';
import DownloadButton from '../../../components/DownloadButton';
import { CopyButton } from '../../../components/tool';
import { CodeEditor, CodeView, DevWorkspace, ModeTabs, Pane, StatusBar } from '../../../components/tool/CodePanes';
import { formatBytes } from '../../../lib/imageUtils';
import { tr } from '../../../lib/i18n';

type Mode = 'encode' | 'decode' | 'file';

type Decoded = { text: string } | { binary: Uint8Array } | { error: string };

function encodeText(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function decodeText(s: string): Decoded {
  let bytes: Uint8Array;
  try {
    // Accept URL-safe Base64 (-, _) and missing padding as well.
    const clean = s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    const padded = clean + '='.repeat((4 - (clean.length % 4)) % 4);
    bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch {
    return { error: tr("That doesn't look like valid Base64.") };
  }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    // Valid Base64, but the data isn't text (an image, a PDF…): offer it as a file.
    return { binary: bytes };
  }
}

export default function Base64Tool() {
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [file, setFile] = useState<{ name: string; size: number; base64: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const decoded = useMemo<Decoded | null>(() => (mode === 'decode' && input.trim() ? decodeText(input) : null), [mode, input]);
  const encoded = mode === 'encode' && input ? encodeText(input) : '';

  const binaryUrl = useMemo(() => (decoded && 'binary' in decoded ? URL.createObjectURL(new Blob([decoded.binary as BlobPart])) : null), [decoded]);
  useEffect(() => () => { if (binaryUrl) URL.revokeObjectURL(binaryUrl); }, [binaryUrl]);
  const fileUrl = useMemo(() => (file ? URL.createObjectURL(new Blob([file.base64], { type: 'text/plain' })) : null), [file]);
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  function readFile(files: File[]) {
    const f = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setFile({ name: f.name, size: f.size, base64: (reader.result as string).split(',')[1] ?? '' });
      setFileError(null);
    };
    reader.onerror = () => setFileError(tr('Could not read that file.'));
    reader.readAsDataURL(f);
  }

  const tabs = (
    <ModeTabs<Mode>
      label={tr('What to do')}
      value={mode}
      onChange={setMode}
      options={[{ value: 'encode', label: tr('Encode') }, { value: 'decode', label: tr('Decode') }, { value: 'file', label: tr('File') }]}
    />
  );

  if (mode === 'file') {
    return (
      <DevWorkspace
        status={<StatusBar state={fileError ? 'error' : file ? 'ok' : 'idle'} message={fileError ?? (file ? tr('Encoded {name}', { name: file.name }) : tr('Choose a file to encode'))} items={file ? [tr('{a} → {b}', { a: formatBytes(file.size), b: formatBytes(file.base64.length) })] : []} />}
      >
        <Pane tabs={tabs} label={tr('File to encode')}>
          <div className="p-3"><FileDropzone onFiles={readFile} hint={tr('Any file type')} /></div>
        </Pane>
        <Pane file={file ? `${file.name}.base64.txt` : 'result.base64.txt'} label={tr('Result')}>
          {file && fileUrl ? (
            <div className="grid min-h-[14rem] place-items-center gap-3 p-6 text-center">
              <p className="break-all font-mono text-[11px] leading-relaxed text-ink-3" dir="ltr">{file.base64.slice(0, 240)}{file.base64.length > 240 ? '…' : ''}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <CopyButton text={file.base64} label="Copy" variant="button" />
                <DownloadButton url={fileUrl} filename={`${file.name}.base64.txt`} label={tr('Download .base64.txt')} />
              </div>
            </div>
          ) : (
            <p className="grid min-h-[14rem] place-items-center px-6 text-center text-xs text-ink-3">{tr('The Base64 text appears here.')}</p>
          )}
        </Pane>
      </DevWorkspace>
    );
  }

  const error = decoded && 'error' in decoded ? decoded.error : null;
  const outText = mode === 'encode' ? encoded : decoded && 'text' in decoded ? decoded.text : '';
  return (
    <DevWorkspace
      status={
        <StatusBar
          state={!input.trim() ? 'idle' : error ? 'error' : 'ok'}
          message={!input.trim() ? (mode === 'encode' ? tr('Type or paste text to encode') : tr('Paste Base64 to decode')) : error ?? (mode === 'encode' ? tr('Encoded') : decoded && 'binary' in decoded ? tr('Decoded: a file, not text') : tr('Decoded'))}
          items={outText ? [tr('{n} characters', { n: outText.length.toLocaleString() })] : []}
        />
      }
    >
      <CodeEditor
        tabs={tabs}
        label={mode === 'encode' ? tr('Text to encode') : tr('Base64 to decode')}
        value={input}
        onChange={setInput}
        wrap
        placeholder={mode === 'encode' ? tr('Hello, Rarvon') : 'SGVsbG8sIFJhcnZvbg=='}
      />
      {decoded && 'binary' in decoded && binaryUrl ? (
        <Pane file="decoded.bin" label={tr('Result')}>
          <div className="grid min-h-[14rem] place-items-center gap-3 p-6 text-center">
            <p className="text-sm text-ink-2">{tr('{n} bytes of binary data (not text).', { n: decoded.binary.length.toLocaleString() })}</p>
            <DownloadButton url={binaryUrl} filename="decoded.bin" label={tr('Download decoded file')} />
          </div>
        </Pane>
      ) : (
        <CodeView file={mode === 'encode' ? 'encoded.txt' : 'decoded.txt'} label={tr('Result')} text={outText} wrap />
      )}
    </DevWorkspace>
  );
}
