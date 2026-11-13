import { Link, NavLink } from 'react-router-dom';
import { categories } from '../lib/toolRegistry';
import { useToolSearch } from '../lib/searchContext';
import ThemeToggle from './ThemeToggle';
import ActionsMenu from './ActionsMenu';
import MobileNavMenu from './MobileNavMenu';

export default function Header() {
  const { openSearch } = useToolSearch();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-ink text-paper text-sm">□</span>
          Bench
        </Link>
        <nav aria-label="Categories" className="hidden items-center gap-1 md:flex">
          <ActionsMenu />
          {categories.map((c) => (
            <NavLink
              key={c.slug}
              to={`/tools/${c.slug}`}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-paper-dim hover:text-ink'
                }`
              }
            >
              {c.name}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={openSearch}
            className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs font-medium text-ink/60 hover:border-ink hover:text-ink"
            aria-label="Search tools"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">Search tools</span>
            <kbd className="hidden rounded border border-line px-1 text-[10px] sm:inline">⌘K</kbd>
          </button>
          <Link
            to="/privacy"
            className="hidden shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-medium text-ink/70 hover:border-ink hover:text-ink lg:flex"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" strokeLinejoin="round" />
            </svg>
            Runs locally
          </Link>
          <ThemeToggle />
          <MobileNavMenu />
        </div>
      </div>
    </header>
  );
}
