import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/usePageMeta';

export default function NotFound() {
  usePageMeta('Page not found', 'This page could not be found.');
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-workshop">404</p>
      <h1 className="mt-2 font-display text-2xl font-semibold">This page doesn't exist</h1>
      <p className="mt-2 text-sm text-ink/60">The tool or page you're looking for may have moved.</p>
      <Link to="/" className="mt-6 inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-workshop">
        Back to home
      </Link>
    </div>
  );
}
