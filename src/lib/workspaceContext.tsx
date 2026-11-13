import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface PendingResult {
  url: string;
  filename: string;
}

interface WorkspaceContextValue {
  pending: PendingResult | null;
  setPending: (result: PendingResult) => void;
  clearPending: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [pending, setPendingState] = useState<PendingResult | null>(null);

  return (
    <WorkspaceContext.Provider
      value={{
        pending,
        setPending: (result) => setPendingState(result),
        clearPending: () => setPendingState(null),
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}

/** Fetches a previously-created blob: URL back into a real File, so it can
 * be handed to another tool's onFiles callback exactly like a fresh upload. */
export async function pendingResultToFile(result: PendingResult): Promise<File> {
  const res = await fetch(result.url);
  const blob = await res.blob();
  return new File([blob], result.filename, { type: blob.type });
}

/** Light compatibility check so a tool only offers to continue with a
 * result that's actually plausible for it \u2014 e.g. don't offer a PDF on an
 * image-only tool. Category-based on file extension, not exact MIME
 * matching, since we deliberately don't fetch the blob just to check this. */
const EXTENSION_CATEGORY: Record<string, string> = {
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', avif: 'image',
  gif: 'image', bmp: 'image', ico: 'image', tif: 'image', tiff: 'image',
  heic: 'image', heif: 'image', svg: 'image',
  pdf: 'application/pdf',
  wav: 'audio', mp3: 'audio', ogg: 'audio', m4a: 'audio', aac: 'audio', flac: 'audio', webm: 'audio',
  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video',
  txt: 'text', json: 'text', csv: 'text',
};

export function isLikelyCompatible(filename: string, accept?: string): boolean {
  if (!accept) return true;
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const category = EXTENSION_CATEGORY[ext];
  if (!category) return true; // unrecognized extension — don't block on it, let the user judge

  const patterns = accept.split(',').map((p) => p.trim().toLowerCase());
  return patterns.some((p) => {
    if (p === category) return true; // exact match, e.g. 'application/pdf'
    if (p.endsWith('/*')) return p.slice(0, -2) === category; // 'image/*' vs category 'image'
    if (p.startsWith('.')) return p.slice(1) === ext; // '.svg' style
    return false;
  });
}
