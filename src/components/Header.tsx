import { Link } from 'react-router-dom';
import { tools } from '../lib/toolRegistry';
import { useToolSearch } from '../lib/searchContext';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import AllToolsMenu from './AllToolsMenu';
import { LogoMark } from './Logo';
import { tr } from '../lib/i18n';

const toolCount = tools.filter((t) => t.status !== 'coming-soon').length;

export default function Header() {
  const { openSearch } = useToolSearch();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-lg font-semibold tracking-tight" aria-label={tr('Bench home')}>
          <LogoMark />
          <span>{tr("Bench")}</span>
        </Link>
        <AllToolsMenu />
        <button
          onClick={openSearch}
          className="ms-auto flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-elevated px-3 text-start text-sm text-ink-3 hover:border-ink sm:ms-2 md:max-w-md"
          aria-label={tr('Search tools')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <span className="truncate">
            <span className="sm:hidden">{tr('Search')}</span>
            <span className="hidden sm:inline">{tr('Search {n} tools', { n: toolCount })}</span>
          </span>
          <kbd className="ms-auto hidden shrink-0 rounded border border-line px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
        </button>
        <span className="hidden flex-1 md:block" aria-hidden="true" />
        <LanguageToggle compact />
        <ThemeToggle />
      </div>
    </header>
  );
}
