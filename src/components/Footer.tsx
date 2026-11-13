import { Link } from 'react-router-dom';
import { categories } from '../lib/toolRegistry';
import SupportButton from './SupportButton';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-paper-dim">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {categories.map((c) => (
            <div key={c.slug}>
              <h3 className="font-display text-sm font-semibold">{c.name}</h3>
              <p className="mt-1 text-xs text-ink-3">{c.description}</p>
              <Link to={`/tools/${c.slug}`} className="mt-2 inline-block text-xs font-medium text-workshop hover:underline">
                Browse {c.name.toLowerCase()} tools
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-xs text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>Free. No ads. No account. Your files never leave your device.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-ink">Privacy</Link>
            <Link to="/about" className="hover:text-ink">About</Link>
            <Link to="/support" className="hover:text-ink">Support</Link>
            <a href="/licenses/third-party.txt" className="hover:text-ink">Open-source licenses</a>
            <SupportButton variant="footer" />
          </div>
        </div>
      </div>
    </footer>
  );
}
