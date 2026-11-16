import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import type { MediaItem, TrackKind, VisualClip } from '../../../lib/videoEditor/types';
import {
  IMAGE_DEFAULT_DURATION, TEXT_DEFAULT_DURATION, clipAt, formatTime, hasEdits, removeClip, splitAt,
  totalDuration, uid, videoStarts, visualDuration,
} from '../../../lib/videoEditor/types';
import { deleteProject, projectFileBlob, safeFileName, PROJECT_EXT, requestPersistence } from '../../../lib/videoEditor/storage';
import { exportProject, ExportCancelled } from '../../../lib/videoEditor/exporter';
import { formatBytes } from '../../../lib/imageUtils';
import { usePageMeta } from '../../../lib/usePageMeta';
import { useEditor } from './useEditor';
import Preview from './Preview';
import Timeline from './Timeline';
import type { Selection } from './Timeline';
import Inspector from './Inspector';
import MediaBin from './MediaBin';
import { ChoiceButton, ICONS, Modal } from './dialogs';
import { handoff } from './openLock';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageToggle from '../../../components/LanguageToggle';
import { tr } from '../../../lib/i18n';

const HOME = '/tools/video/editor';

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export default function Workspace() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const ed = useEditor(id);
  const { project } = ed;
  usePageMeta(project ? `${project.name} · ${tr('Video Editor')}` : tr('Video Editor'), tr('Cut, join and caption videos on a simple timeline.'));

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pps, setPps] = useState(40);
  const [exitOpen, setExitOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const leaving = useRef(false);
  const exitAfterExport = useRef(false);

  const total = project ? totalDuration(project.timeline) : 0;
  // A choice is needed when the timeline has content and was changed in this visit (or left unsettled last time).
  const needChoice = Boolean(project && hasEdits(project.timeline) && (ed.dirty || (!project.browserSave && project.pendingChoice)));

  // Browser tab/window close: browsers only allow their own generic warning.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!needChoice || leaving.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [needChoice]);


  const add = useCallback((m: MediaItem, kind?: TrackKind, at?: number) => {
    const p = ed.current();
    if (!p) return;
    const tl = p.timeline;
    const target: TrackKind = kind ?? (m.type === 'audio' ? 'audio' : 'video');
    if (target === 'text') return;
    if (target === 'video') {
      if (m.type === 'audio') return;
      const clip: VisualClip = {
        id: uid(), mediaId: m.id, in: 0, out: m.type === 'image' ? IMAGE_DEFAULT_DURATION : m.duration,
        speed: 1, volume: 1, muted: false, fit: 'contain', fadeIn: 0, fadeOut: 0,
      };
      let idx = tl.video.length;
      if (at !== undefined) {
        const starts = videoStarts(tl.video);
        const found = tl.video.findIndex((c, i) => at < starts[i] + visualDuration(c) / 2);
        if (found >= 0) idx = found;
      }
      ed.setTimeline({ ...tl, video: [...tl.video.slice(0, idx), clip, ...tl.video.slice(idx)] });
      setSelection({ kind: 'video', id: clip.id });
      return;
    }
    if (!m.hasAudio && m.type !== 'audio') return;
    const clip = { id: uid(), mediaId: m.id, start: at ?? time, in: 0, out: m.duration, volume: 1, fadeIn: 0, fadeOut: 0 };
    ed.setTimeline({ ...tl, audio: [...tl.audio, clip] });
    setSelection({ kind: 'audio', id: clip.id });
  }, [ed, time]);

  // Files handed over from the projects page ("start a project with this video").
  const handled = useRef(false);
  useEffect(() => {
    if (!project || handled.current) return;
    handled.current = true;
    void requestPersistence();
    if (!handoff.files.length) return;
    const list = handoff.files;
    handoff.files = [];
    void ed.importFiles(list).then((items) => {
      // The project state updates asynchronously; add after it has the media.
      setTimeout(() => items.forEach((m) => add(m)), 0);
    });
  }, [project, ed, add]);

  const addText = () => {
    const p = ed.current();
    if (!p) return;
    const clip = { id: uid(), start: time, duration: TEXT_DEFAULT_DURATION, text: 'Your text', size: 0.08, color: '#ffffff', position: 'bottom' as const, box: false, fadeIn: 0, fadeOut: 0 };
    ed.setTimeline({ ...p.timeline, text: [...p.timeline.text, clip] });
    setSelection({ kind: 'text', id: clip.id });
  };

  const split = useCallback(() => {
    const p = ed.current();
    if (!p) return;
    const sel = selection ?? (() => {
      const vid = clipAt(p.timeline, 'video', time);
      return vid ? { kind: 'video' as const, id: vid } : null;
    })();
    if (!sel) return;
    const next = splitAt(p.timeline, sel.kind, sel.id, time);
    if (!next) return;
    ed.setTimeline(next);
    const list = next[sel.kind] as { id: string }[];
    const i = list.findIndex((c) => c.id === sel.id);
    if (list[i + 1]) setSelection({ kind: sel.kind, id: list[i + 1].id });
  }, [ed, selection, time]);

  const del = useCallback(() => {
    const p = ed.current();
    if (!p || !selection) return;
    ed.setTimeline(removeClip(p.timeline, selection.kind, selection.id));
    setSelection(null);
  }, [ed, selection]);

  // ---- Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable=true]') || exitOpen || exportOpen) return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) ed.redo();
        else ed.undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        ed.redo();
      } else if (!mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        split();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection) {
          e.preventDefault();
          del();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const stepSize = e.shiftKey ? 1 : 1 / 30;
        setPlaying(false);
        setTime((t) => Math.max(0, Math.min(total, t + (e.key === 'ArrowLeft' ? -stepSize : stepSize))));
      } else if (e.key === 'Home') {
        setTime(0);
      } else if (e.key === 'Escape') {
        setSelection(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ed, split, del, selection, total, exitOpen, exportOpen]);

  // ---- Leaving
  const leave = useCallback(() => {
    leaving.current = true;
    navigate(HOME);
  }, [navigate]);

  const requestExit = async () => {
    setPlaying(false);
    const p = ed.current();
    if (!p) return navigate(HOME);
    if (needChoice) {
      setExitOpen(true);
      return;
    }
    // Nothing to decide: a browser-only recovery copy of an untouched project isn't needed.
    if (!p.browserSave) await deleteProject(p.id);
    leave();
  };

  const saveAndLeave = async () => {
    const p = ed.current()!;
    setBusy(tr("Saving…"));
    const next = { ...p, browserSave: true, pendingChoice: false };
    ed.update(() => next, { edit: false });
    await ed.flush(next);
    leave();
  };

  const keepFolderAndLeave = async () => {
    const p = ed.current()!;
    setBusy(tr("Saving…"));
    const next = { ...p, pendingChoice: false };
    await ed.flush(next);
    if (!p.browserSave) await deleteProject(p.id);
    leave();
  };

  const downloadProjectFile = async (thenLeave: boolean) => {
    const p = ed.current()!;
    setBusy(tr("Preparing the project file… 0%"));
    try {
      const blob = await projectFileBlob(p, ed.files, (f) => setBusy(tr("Preparing the project file… {0}%", { 0: Math.round(f * 100) })));
      downloadBlob(blob, safeFileName(p.name) + PROJECT_EXT);
      if (thenLeave) {
        if (p.browserSave) {
          const next = { ...p, pendingChoice: false };
          await ed.flush(next);
        } else await deleteProject(p.id);
        // Give the browser a moment to start the download before the page changes.
        setTimeout(leave, 400);
      } else setBusy(null);
    } catch {
      setBusy(null);
      alert("The project file couldn't be created. Your project is still here.");
    }
  };

  const discard = async () => {
    const p = ed.current()!;
    setBusy(tr("Deleting…"));
    await deleteProject(p.id);
    leave();
  };

  if (ed.loadError) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper p-6 text-center">
        <div>
          <p className="text-sm text-ink-2">{ed.loadError}</p>
          <Link to={HOME} className="mt-4 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">{tr("Back to your projects")}</Link>
        </div>
      </div>
    );
  }
  if (!project) {
    return <div className="grid min-h-screen place-items-center bg-paper text-sm text-ink-3">{tr("Opening project…")}</div>;
  }

  const saveLabel = (() => {
    if (ed.saveStatus === 'saving') return tr('Saving…');
    if (ed.saveStatus === 'error') return tr('Couldn’t save');
    const inBrowser = project.browserSave;
    const inFolder = project.folderSave && ed.folderStatus === 'ok';
    if (inBrowser && inFolder) return tr('Saved to this browser and your folder');
    if (inBrowser) return tr('Saved to this browser');
    return inFolder ? tr('Saved to your folder') : tr('Not saved yet');
  })();

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink lg:h-screen lg:overflow-hidden" data-testid="video-editor">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-elevated px-3">
        <button onClick={() => void requestExit()} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-ink-2 hover:bg-paper-dim hover:text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="rtl:-scale-x-100"><path d={ICONS.back} /></svg>
          {tr("Exit")}
        </button>
        <span className="h-5 w-px bg-line" aria-hidden="true" />
        <h1 className="min-w-0 truncate font-display text-sm font-semibold">{project.name}</h1>
        <span className={clsx('hidden items-center gap-1.5 text-xs sm:inline-flex', ed.saveStatus === 'error' ? 'text-warn' : 'text-ink-3')} data-testid="save-status">
          <span className={clsx('h-1.5 w-1.5 rounded-full', ed.saveStatus === 'saving' ? 'bg-ink-3' : ed.saveStatus === 'error' ? 'bg-warn' : 'bg-signal')} aria-hidden="true" />
          {saveLabel}
        </span>
        {project.folderSave && ed.folderStatus !== 'ok' && (
          <button onClick={() => void ed.connectFolder(false)} className="rounded-md border border-warn/50 px-2 py-1 text-xs text-warn hover:bg-warn-dim">
            {tr("Reconnect folder")}
          </button>
        )}
        <div className="ms-auto flex items-center gap-2">
          <LanguageToggle compact />
          <ThemeToggle />
          <button
            onClick={() => void downloadProjectFile(false)}
            className="hidden items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium hover:border-ink sm:inline-flex"
            title={tr("Download a project file you can open again later")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS.download} /></svg>
            {tr("Project file")}
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setExportOpen(true);
            }}
            disabled={total <= 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-workshop px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            {tr("Export")}
          </button>
        </div>
      </header>

      {/* Media | Preview | Settings */}
      <div className="min-h-0 flex-1 max-lg:contents lg:grid lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="order-3 min-h-0 border-line bg-elevated lg:order-none lg:border-e" aria-label={tr("Media")}>
          <MediaBin
            project={project}
            importing={ed.importing}
            errors={ed.importErrors}
            onDismissErrors={() => ed.setImportErrors([])}
            onImport={(f) => void ed.importFiles(f)}
            onAdd={(m) => add(m)}
            onRemove={(m) => {
              const inUse = project.timeline.video.some((c) => c.mediaId === m.id) || project.timeline.audio.some((c) => c.mediaId === m.id);
              if (inUse && !confirm(`“${m.name}” is used on the timeline. Remove it and its clips?`)) return;
              ed.removeMedia(m.id);
              setSelection(null);
            }}
          />
        </aside>

        <section className="flex min-h-[260px] flex-col bg-paper-dim max-lg:order-1" aria-label={tr("Preview")}>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
            <Preview project={project} urls={ed.urls} time={time} playing={playing} onTime={setTime} onEnded={() => setPlaying(false)} />
          </div>
          <div className="flex items-center justify-center gap-3 border-t border-line bg-elevated px-3 py-2">
            <button onClick={() => { setPlaying(false); setTime(0); }} className="grid h-8 w-8 place-items-center rounded-md text-ink-2 hover:bg-paper-dim" aria-label={tr("Go to start")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              disabled={total <= 0}
              className="grid h-9 w-9 place-items-center rounded-full bg-ink text-paper hover:opacity-90 disabled:opacity-40"
              aria-label={playing ? tr("Pause") : tr("Play")}
            >
              {playing
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>}
            </button>
            <span className="min-w-[110px] font-mono text-xs text-ink-2" data-testid="time-display">{formatTime(time)} / {formatTime(total)}</span>
          </div>
        </section>

        <aside className="order-4 min-h-0 overflow-y-auto border-line bg-elevated lg:order-none lg:border-s" aria-label={tr("Clip settings")}>
          <Inspector
            project={project}
            selection={selection}
            onTimeline={(tl, commit) => ed.setTimeline(tl, commit)}
            onProject={(patch) => ed.update((p) => ({ ...p, ...patch }))}
            onDelete={del}
          />
        </aside>
      </div>

      {/* Timeline */}
      <div className="order-2 shrink-0 border-t border-line bg-elevated">
        <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5" role="toolbar" aria-label={tr("Timeline tools")}>
          <ToolButton label={tr("Undo")} shortcut="Ctrl+Z" onClick={ed.undo} disabled={!ed.canUndo} icon="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3" />
          <ToolButton label={tr("Redo")} shortcut="Ctrl+Shift+Z" onClick={ed.redo} disabled={!ed.canRedo} icon="M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3" />
          <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
          <ToolButton label={tr("Split")} shortcut="S" onClick={split} disabled={total <= 0} icon="M12 3v18M7 8l-4 4 4 4M17 8l4 4-4 4" text />
          <ToolButton label={tr("Delete")} shortcut="Del" onClick={del} disabled={!selection} icon={ICONS.trash} text />
          <ToolButton label={tr("Add text")} onClick={addText} icon="M5 6V4h14v2M12 4v16M9 20h6" text />
          {selection?.kind === 'video' && (() => {
            const c = project.timeline.video.find((x) => x.id === selection.id);
            const m = c && project.media.find((x) => x.id === c.mediaId);
            if (!c || m?.type !== 'video' || !m.hasAudio) return null;
            return (
              <ToolButton
                label={c.muted ? tr("Restore audio") : tr("Remove audio")}
                onClick={() => ed.setTimeline({ ...project.timeline, video: project.timeline.video.map((x) => (x.id === c.id ? { ...x, muted: !x.muted } : x)) })}
                icon={c.muted ? 'M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13' : 'M11 5L6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6'}
                text
              />
            );
          })()}
          <div className="ms-auto flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-ink-3">
              <span className="hidden sm:inline">{tr("Zoom")}</span>
              <input type="range" min={8} max={240} value={pps} onChange={(e) => setPps(Number(e.target.value))} className="w-24 accent-[var(--color-workshop)]" aria-label={tr("Timeline zoom")} />
            </label>
          </div>
        </div>
        <div className="h-[176px]">
          <Timeline
            project={project}
            time={time}
            pps={pps}
            selection={selection}
            onSelect={setSelection}
            onSeek={(t) => {
              setPlaying(false);
              setTime(Math.min(t, Math.max(total, 0)));
            }}
            onChange={(tl, commit) => ed.setTimeline(tl, commit)}
            onDropMedia={(mediaId, kind, at) => {
              const m = project.media.find((x) => x.id === mediaId);
              if (m) add(m, kind, at);
            }}
          />
        </div>
      </div>

      {exitOpen && (
        <Modal title={tr("Before you leave")} locked labelledBy="exit-title">
          {busy ? (
            <p className="py-6 text-center text-sm text-ink-2" role="status">{busy}</p>
          ) : confirmDiscard ? (
            <div className="grid gap-4">
              <p className="text-sm text-ink-2">
                {tr("Delete “")}{project.name}{tr("” and its media from this browser? This can’t be undone.")}
                {project.folderSave && tr(" Files already in your folder stay there.")}
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmDiscard(false)} className="rounded-md border border-line px-4 py-2 text-sm hover:border-ink">{tr("Go back")}</button>
                <button onClick={() => void discard()} className="rounded-md bg-warn px-4 py-2 text-sm font-semibold text-white hover:opacity-90">{tr("Discard project")}</button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <p className="mb-2 text-sm text-ink-2">{tr("You changed this project. What should happen to it?")}</p>
              <ChoiceButton
                tone="primary"
                icon={ICONS.save}
                title={project.browserSave ? tr("Keep it saved") : tr("Save project")}
                detail={project.browserSave ? 'It’s already auto-saved in this browser. Open it again from “Your projects”.' : 'Keep it in this browser so you can open it again from “Your projects”.'}
                onClick={() => void saveAndLeave()}
              />
              {project.folderSave && ed.folderStatus === 'ok' && !project.browserSave && (
                <ChoiceButton icon={ICONS.folder} title={tr("Keep it in my folder")} detail="Every change is already saved to the folder you picked." onClick={() => void keepFolderAndLeave()} />
              )}
              <ChoiceButton icon={ICONS.download} title={tr("Download project file")} detail={`A ${PROJECT_EXT} file with everything in it. Open it later in any browser.`} onClick={() => void downloadProjectFile(true)} />
              <ChoiceButton
                icon={ICONS.film}
                title={tr("Export the video")}
                detail="Make the MP4 first. You’ll come back here afterwards."
                onClick={() => {
                  setExitOpen(false);
                  setExportOpen(true);
                  exitAfterExport.current = true;
                }}
              />
              <ChoiceButton tone="danger" icon={ICONS.trash} title={tr("Discard project")} detail="Delete it and everything in it." onClick={() => setConfirmDiscard(true)} />
              <button onClick={() => setExitOpen(false)} className="mt-2 rounded-md px-3 py-2 text-sm text-ink-2 hover:bg-paper-dim hover:text-ink">
                {tr("Stay in the editor")}
              </button>
            </div>
          )}
        </Modal>
      )}

      {exportOpen && (
        <ExportDialog
          onClose={() => {
            setExportOpen(false);
            if (exitAfterExport.current) {
              exitAfterExport.current = false;
              setExitOpen(true);
            }
          }}
          run={(quality, onProgress, signal) => exportProject(ed.current()!, ed.files, { quality, fps: 30, onProgress, signal })}
          fileName={`${safeFileName(project.name)}.mp4`}
        />
      )}
      {busy && !exitOpen && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs text-paper shadow-lg" role="status">{busy}</div>
      )}
    </div>
  );
}


function ToolButton({ label, shortcut, onClick, disabled, icon, text }: { label: string; shortcut?: string; onClick: () => void; disabled?: boolean; icon: string; text?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-ink-2 hover:bg-paper-dim hover:text-ink disabled:pointer-events-none disabled:opacity-40"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg>
      {text && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}

function ExportDialog({ onClose, run, fileName }: {
  onClose: () => void;
  run: (q: '720p' | '1080p', onProgress: (f: number, stage: string) => void, signal: AbortSignal) => Promise<Blob>;
  fileName: string;
}) {
  const [quality, setQuality] = useState<'720p' | '1080p'>('1080p');
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'running'; f: number; stage: string } | { kind: 'done'; blob: Blob; url: string } | { kind: 'error'; message: string }>({ kind: 'idle' });
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => () => {
    ctrl.current?.abort();
    if (state.kind === 'done') URL.revokeObjectURL(state.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    ctrl.current = new AbortController();
    setState({ kind: 'running', f: 0, stage: 'Starting' });
    try {
      const blob = await run(quality, (f, stage) => setState({ kind: 'running', f, stage }), ctrl.current.signal);
      setState({ kind: 'done', blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      if (e instanceof ExportCancelled) setState({ kind: 'idle' });
      else setState({ kind: 'error', message: e instanceof Error ? e.message : 'The export failed.' });
    }
  };

  return (
    <Modal title={tr("Export video")} onClose={state.kind === 'running' ? undefined : onClose} locked={state.kind === 'running'} labelledBy="export-title" wide>
      {state.kind === 'idle' || state.kind === 'error' ? (
        <div className="grid gap-4">
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-ink-2">{tr("Quality")}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['1080p', '720p'] as const).map((q) => (
                <label key={q} className={clsx('relative cursor-pointer rounded-lg border p-3', quality === q ? 'border-workshop bg-workshop-dim' : 'border-line hover:border-ink')}>
                  <input type="radio" name="export-quality" checked={quality === q} onChange={() => setQuality(q)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={q} />
                  <span className="block text-sm font-semibold">{q === '1080p' ? tr("Full HD (1080p)") : tr("HD (720p)")}</span>
                  <span className="block text-xs text-ink-3">{q === '1080p' ? tr("Best quality") : tr("Smaller and faster")}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-ink-3">{tr("MP4 (H.264 and AAC) at 30 frames per second. It plays everywhere.")}</p>
          {state.kind === 'error' && <p className="rounded-md bg-warn-dim p-2 text-sm text-warn" role="alert">{state.message}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-md border border-line px-4 py-2 text-sm hover:border-ink">{tr("Cancel")}</button>
            <button onClick={() => void start()} className="rounded-md bg-workshop px-4 py-2 text-sm font-semibold text-white hover:opacity-90">{tr("Export MP4")}</button>
          </div>
        </div>
      ) : state.kind === 'running' ? (
        <div className="grid gap-3" role="status">
          <div className="flex justify-between text-sm">
            <span className="text-ink-2">{tr(state.stage)}…</span>
            <span className="font-mono">{Math.round(state.f * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-paper-dim">
            <div className="h-full rounded-full bg-workshop transition-[width]" style={{ width: `${Math.round(state.f * 100)}%` }} />
          </div>
          <p className="text-xs text-ink-3">{tr("Keep this tab open. Longer videos take a while.")}</p>
          <div className="flex justify-end">
            <button onClick={() => ctrl.current?.abort()} className="rounded-md border border-line px-4 py-2 text-sm hover:border-warn hover:text-warn">{tr("Cancel export")}</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <video src={state.url} controls className="max-h-[50vh] w-full rounded-md bg-black" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink-2">{fileName} · {formatBytes(state.blob.size)}</span>
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-md border border-line px-4 py-2 text-sm hover:border-ink">{tr("Close")}</button>
              <button onClick={() => downloadBlob(state.blob, fileName)} className="rounded-md bg-workshop px-4 py-2 text-sm font-semibold text-white hover:opacity-90">{tr("Download MP4")}</button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
