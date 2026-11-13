import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { actionMeta } from '../lib/toolRegistry';
import { ActionIcon } from '../lib/actionIcons';

export default function ActionsMenu() {
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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="rounded-md px-3 py-2 text-sm font-medium text-ink/70 hover:bg-paper-dim hover:text-ink"
      >
        Actions
      </button>
      {open && (
        <div role="menu" className="absolute left-0 z-30 mt-1 w-56 overflow-hidden rounded-md border border-line bg-elevated py-1 shadow-lg">
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
        </div>
      )}
    </div>
  );
}
