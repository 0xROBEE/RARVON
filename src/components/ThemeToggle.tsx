import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../lib/themeContext';
import type { ThemePreference } from '../lib/themeContext';

const OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '🖥️' },
];

export default function ThemeToggle() {
  const { preference, setPreference } = useTheme();
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

  const current = OPTIONS.find((o) => o.value === preference) ?? OPTIONS[2];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}. Click to change.`}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-sm hover:border-ink"
      >
        <span aria-hidden="true">{current.icon}</span>
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 z-30 mt-1 w-32 overflow-hidden rounded-md border border-line bg-elevated py-1 text-sm shadow-lg"
        >
          {OPTIONS.map((o) => (
            <li key={o.value} role="none">
              <button
                role="menuitemradio"
                aria-checked={preference === o.value}
                onClick={() => {
                  setPreference(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-paper-dim ${preference === o.value ? 'font-medium text-workshop' : 'text-ink/70'}`}
              >
                <span aria-hidden="true">{o.icon}</span>
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
