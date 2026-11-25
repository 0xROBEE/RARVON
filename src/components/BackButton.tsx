import { Link, useLocation, useNavigate } from 'react-router-dom';
import { tr } from '../lib/i18n';

/**
 * Back to wherever the person came from inside Rarvon (search, home, another
 * tool…), or to `fallback` when the page was opened directly.
 * A real link, so middle-click and "open in new tab" still work.
 */
export default function BackButton({ fallback }: { fallback: string }) {
  const navigate = useNavigate();
  const { key } = useLocation();
  const cameFromRarvon = key !== 'default';
  return (
    <Link
      to={fallback}
      onClick={(e) => {
        if (!cameFromRarvon || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(-1);
      }}
      className="inline-flex h-7 items-center gap-1 rounded-full border border-line pe-2.5 ps-1.5 font-medium text-ink-2 transition-colors hover:border-ink hover:text-ink"
      data-testid="tool-back"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="rtl:-scale-x-100">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {tr('Back')}
    </Link>
  );
}
