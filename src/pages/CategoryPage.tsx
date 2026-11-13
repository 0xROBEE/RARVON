import { useParams, Navigate, Link } from 'react-router-dom';
import { getCategory, toolsForCategory } from '../lib/toolRegistry';
import ToolCard from '../components/ToolCard';
import { usePageMeta } from '../lib/usePageMeta';

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const meta = getCategory(category ?? '');
  usePageMeta(
    meta ? `${meta.name} tools` : 'Bench',
    meta ? meta.description : '',
  );
  if (!meta) return <Navigate to="/" replace />;
  const list = toolsForCategory(meta.slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink/50">
        <Link to="/" className="hover:text-ink">Home</Link> <span aria-hidden="true">/</span> <span className="text-ink">{meta.name}</span>
      </nav>
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{meta.name} tools</h1>
      <p className="mt-2 max-w-xl text-sm text-ink/60">{meta.description}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t) => (
          <ToolCard key={t.slug} tool={t} />
        ))}
      </div>
    </div>
  );
}
