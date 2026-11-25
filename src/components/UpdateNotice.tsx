import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { isBenchApp } from '../engine/info';
import {
  SNOOZE, UPDATE_CHECK_EVERY, isNewerVersion, loadAppPrefs, newestRelease, releaseHighlights, shouldCheckForUpdate, updateAppPrefs, useAppPrefs,
} from '../lib/appPrefs';
import type { Release } from '../lib/appPrefs';
import { tr } from '../lib/i18n';

/** Where Rarvon's releases are published. */
const RELEASES_API = 'https://api.github.com/repos/0xROBEE/RARVON/releases?per_page=20';
const RELEASES_PAGE = 'https://github.com/0xROBEE/RARVON/releases';

/**
 * When it opens and every few hours, the Rarvon app asks GitHub which version
 * is the newest, and shows a notice when it is newer than this one. The
 * request carries nothing about you or your files (it is the same as opening
 * a web page), it never downloads or installs anything, and it can be turned
 * off. The website never checks.
 */
export async function checkForUpdate(force = false) {
  const prefs = await loadAppPrefs();
  if (!prefs.updateCheck || (!force && !shouldCheckForUpdate(prefs, Date.now(), window.__BENCH_APP__?.version))) return;
  try {
    const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' }, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok) return;
    const newest = newestRelease((await res.json()) as Release[]);
    updateAppPrefs({
      lastUpdateCheck: Date.now(),
      latestVersion: newest?.tag_name?.replace(/^v/i, ''),
      latestUrl: newest?.html_url,
      latestNotes: releaseHighlights(newest?.body),
    });
  } catch {
    // Offline or blocked: try again next time.
  }
}

/* "Show a test notice" (Privacy page): shows the notice with sample text, without saving anything. */
let preview = false;
const previewListeners = new Set<() => void>();
export function showTestNotice() {
  preview = true;
  previewListeners.forEach((l) => l());
}
function endPreview() {
  preview = false;
  previewListeners.forEach((l) => l());
}
const usePreview = () => useSyncExternalStore((l) => (previewListeners.add(l), () => previewListeners.delete(l)), () => preview, () => false);

interface Notice {
  version: string;
  current: string;
  url: string;
  notes: string[];
  test: boolean;
}

/** The notice to show now, if any. */
function useNotice(): Notice | null {
  const prefs = useAppPrefs();
  const test = usePreview();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // Re-check now and then, so a snooze that ends brings the notice back by itself.
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const current = window.__BENCH_APP__?.version ?? '';
  if (!isBenchApp()) return null;
  if (test) return { version: current || '1.0.0', current: current || '1.0.0', url: RELEASES_PAGE, notes: [tr('This is a test notice'), tr('Real notices show the new version’s highlights')], test: true };
  const v = prefs.latestVersion;
  if (!prefs.updateCheck || !v || !current || !isNewerVersion(v, current)) return null;
  if (prefs.snoozeUntil && now < prefs.snoozeUntil) return null;
  const url = prefs.latestUrl?.startsWith('https://github.com/') ? prefs.latestUrl : RELEASES_PAGE;
  return { version: v, current, url, notes: prefs.latestNotes ?? [], test: false };
}

function snooze(notice: Notice, ms: number) {
  if (notice.test) endPreview();
  else updateAppPrefs({ snoozeUntil: Date.now() + ms });
}

/** Three round dots, drawn in the text colour so they show in light and dark. */
function Dots() {
  return (
    <span className="upd-dots" aria-hidden="true">
      <i /><i /><i />
    </span>
  );
}

/** The ⋯ menu: snooze for a while, check now, the automatic check switch, and why. */
function NoticeMenu({ notice, up }: { notice: Notice; up?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const prefs = useAppPrefs();
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const item = (icon: string, label: string, onClick: () => void, extra?: ReactNode) => (
    <button type="button" role="menuitem" className="upd-menu-item" onClick={() => { onClick(); setOpen(false); }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg>
      <span className="flex-1 text-start">{label}</span>
      {extra}
    </button>
  );

  return (
    <span ref={box} className="relative inline-flex">
      <button type="button" className={clsx('upd-btn upd-more', open && 'is-open')} aria-label={tr('More options')} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="update-more">
        <Dots />
      </button>
      {open && (
        <span role="menu" className={clsx('upd-menu', up ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]')}>
          {item('M12 7v5l3 2M3 12a9 9 0 1018 0 9 9 0 00-18 0', tr('Remind me in an hour'), () => snooze(notice, SNOOZE.hour))}
          {item('M21 13A9 9 0 1111 3a7 7 0 0010 10z', tr('Silence for 1 day'), () => snooze(notice, SNOOZE.day))}
          {item('M4 5h16v16H4zM4 10h16M9 3v4M15 3v4M9 14l6 6M15 14l-6 6', tr('Silence for 1 week'), () => snooze(notice, SNOOZE.week))}
          <span className="upd-menu-rule" />
          {item('M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.5-4.5', tr('Check now'), () => void checkForUpdate(true))}
          {item('M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5', tr('Check for updates automatically'), () => updateAppPrefs({ updateCheck: !prefs.updateCheck }),
            <span className={clsx('upd-switch', prefs.updateCheck && 'is-on')} aria-hidden="true" />)}
          <Link role="menuitem" to="/privacy#updates" className="upd-menu-item" onClick={() => setOpen(false)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM9 12l2 2 4-4" /></svg>
            <span className="flex-1 text-start">{tr('Why am I seeing this?')}</span>
          </Link>
        </span>
      )}
    </span>
  );
}

const Later = ({ onClick }: { onClick: () => void }) => (
  <button type="button" className="upd-btn upd-later" onClick={onClick}>
    {tr('Later')}<span className="upd-zz" aria-hidden="true">z</span>
  </button>
);

const UpdateNow = ({ notice, small }: { notice: Notice; small?: boolean }) => (
  <a href={notice.url} target="_blank" rel="noreferrer" className={clsx('upd-btn upd-go', small && 'text-xs')}>{tr('Update now')}</a>
);

/** On the home page: a bar above the header. */
function NoticeBar({ notice, barRef }: { notice: Notice; barRef: (el: HTMLDivElement | null) => void }) {
  const [leaving, setLeaving] = useState(false);
  return (
    <div ref={barRef} className={clsx('upd-bar-slot', leaving && 'is-leaving')} data-testid="update-notice">
      <div role="status" className="upd-bar mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="upd-new">{tr('NEW')}</span>
        <span>
          <strong className="font-semibold">{tr('Rarvon {v} is ready', { v: notice.version })}</strong>
          <span className="upd-sub"> · {tr('you have {v}', { v: notice.current })}</span>
        </span>
        <span className="ms-auto flex items-center gap-1.5">
          <UpdateNow notice={notice} />
          <Later onClick={() => { setLeaving(true); window.setTimeout(() => snooze(notice, SNOOZE.hour), 450); }} />
          <NoticeMenu notice={notice} />
        </span>
      </div>
    </div>
  );
}

/** Everywhere else (and on the home page once the bar is scrolled away): a floating card. */
function NoticeCard({ notice }: { notice: Notice }) {
  const card = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  function tilt(e: PointerEvent<HTMLDivElement>) {
    const el = card.current;
    if (!el || e.pointerType !== 'mouse' || leaving) return;
    const r = el.getBoundingClientRect();
    // Limited to the card's own edges: over the ⋯ menu (above the card) it leans no further back.
    const clamp = (n: number) => Math.max(-0.5, Math.min(0.5, n));
    const x = clamp((e.clientX - r.left) / r.width - 0.5);
    const y = clamp((e.clientY - r.top) / r.height - 0.5);
    el.style.transform = `perspective(700px) rotateX(${(-y * 8).toFixed(1)}deg) rotateY(${(x * 10).toFixed(1)}deg) translateY(-3px)`;
  }
  return (
    <div
      ref={card}
      role="status"
      onPointerMove={tilt}
      onPointerLeave={() => { if (card.current) card.current.style.transform = ''; }}
      className={clsx('upd-card', leaving ? 'is-leaving' : 'is-in')}
      data-testid="update-card"
    >
      <span className="upd-card-skin" aria-hidden="true"><span className="upd-card-tide" /><span className="upd-card-edge" /></span>
      <span className="upd-card-ring" aria-hidden="true" />
      <div className="relative px-4 pb-3 pt-3.5 ps-5">
        <div className="flex items-center gap-2 text-sm">
          <span className="upd-card-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" /></svg>
          </span>
          <strong className="font-semibold">{tr('Rarvon {v} is here', { v: notice.version })}</strong>
          <span className="upd-new">{tr('NEW')}</span>
          <span className="ms-auto"><NoticeMenu notice={notice} up /></span>
        </div>
        <p className="mt-1 text-xs text-ink-2">{notice.notes.length ? tr('You have {v}. What’s new:', { v: notice.current }) : tr('You have {v}.', { v: notice.current })}</p>
        {notice.notes.length > 0 && (
          <ul className="upd-notes mt-1 list-disc ps-4 text-xs leading-relaxed text-ink-2">
            {notice.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        )}
        <div className="mt-3 flex items-center gap-1.5">
          <UpdateNow notice={notice} small />
          <Later onClick={() => { setLeaving(true); window.setTimeout(() => snooze(notice, SNOOZE.hour), 450); }} />
          <a href={notice.url} target="_blank" rel="noreferrer" className="upd-full ms-auto text-xs font-medium">{tr('Full notes')} ↗</a>
        </div>
      </div>
    </div>
  );
}

/**
 * The update notice in the Rarvon app: a bar above the header on the home
 * page, and a floating card on other pages or once the bar is scrolled out of
 * view. "Later" hides both for an hour; the ⋯ menu can silence them for a day
 * or a week.
 */
export default function UpdateNotice() {
  const notice = useNotice();
  const onHome = useLocation().pathname === '/';
  const [barEl, setBarEl] = useState<HTMLDivElement | null>(null);
  const [barInView, setBarInView] = useState(true);

  useEffect(() => {
    if (!isBenchApp()) return;
    void checkForUpdate();
    const timer = window.setInterval(() => void checkForUpdate(), UPDATE_CHECK_EVERY);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!barEl) return;
    const io = new IntersectionObserver(([e]) => setBarInView(e.isIntersecting), { threshold: 0 });
    io.observe(barEl);
    return () => io.disconnect();
  }, [barEl]);

  if (!notice) return null;
  const key = `${notice.version}-${notice.test}`;
  return (
    <>
      {onHome && <NoticeBar key={key} notice={notice} barRef={setBarEl} />}
      {(!onHome || !barInView) && <NoticeCard key={`card-${key}`} notice={notice} />}
    </>
  );
}
