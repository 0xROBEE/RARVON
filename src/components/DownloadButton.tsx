import { useEffect } from 'react';
import Button from './Button';
import { useWorkspace } from '../lib/workspaceContext';

interface DownloadButtonProps {
  url: string;
  filename: string;
  label?: string;
}

export default function DownloadButton({ url, filename, label = 'Download result' }: DownloadButtonProps) {
  const { setPending } = useWorkspace();

  // Every result a tool produces becomes available for other tools to pick
  // up directly, without the user re-downloading and re-uploading it. This
  // one effect is what makes chaining work across the whole site, since
  // DownloadButton is already the shared result affordance almost every
  // tool uses.
  useEffect(() => {
    setPending({ url, filename });
  }, [url, filename, setPending]);

  return (
    <Button
      onClick={() => {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 4v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 18v1a2 2 0 002 2h12a2 2 0 002-2v-1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Button>
  );
}
