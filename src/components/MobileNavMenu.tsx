import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { categories, actionMeta } from '../lib/toolRegistry';
import { ActionIcon } from '../lib/actionIcons';

export default function MobileNavMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Browse tools"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-line hover:border-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-64 overflow-hidden rounded-md border border-line bg-elevated py-2 shadow-lg"
        >
          <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-ink/40">By action</p>
          {actionMeta.map((a) => (
            <Link
              key={a.value}
              role="menuitem"
              to={`/${a.value}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-ink/70 hover:bg-paper-dim hover:text-ink"
            >
              <ActionIcon action={a.value} className="shrink-0 text-workshop" />
              {a.label}
            </Link>
          ))}
          <p className="mt-1 border-t border-line px-3 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-ink/40">
            By category
          </p>
          {categories.map((c) => (
            <Link
              key={c.slug}
              role="menuitem"
              to={`/tools/${c.slug}`}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-ink/70 hover:bg-paper-dim hover:text-ink"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
