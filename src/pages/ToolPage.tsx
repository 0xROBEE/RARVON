import { Suspense } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getTool, getCategory, EXPERIMENTAL_NOTE } from '../lib/toolRegistry';
import { toolComponents } from '../lib/toolComponents';
import ToolPageShell from '../components/ToolPageShell';
import ComingSoonNotice from '../components/ComingSoonNotice';
import ExperimentalNotice from '../components/ExperimentalNotice';
import { usePageMeta, toolJsonLd } from '../lib/usePageMeta';

export default function ToolPage() {
  const { category, slug } = useParams<{ category: string; slug: string }>();
  const tool = getTool(category ?? '', slug ?? '');
  usePageMeta(tool ? tool.name : 'Bench', tool ? tool.shortDescription : '', {
    jsonLd: tool ? toolJsonLd(tool, getCategory(tool.category)?.name ?? '') : null,
  });
  if (!tool) return <Navigate to="/" replace />;

  const Component = toolComponents[`${tool.category}/${tool.slug}`];

  if (tool.status === 'coming-soon' && !Component) {
    return (
      <ToolPageShell tool={tool}>
        <ComingSoonNotice reason={tool.comingSoonReason} />
      </ToolPageShell>
    );
  }

  return (
    <ToolPageShell tool={tool}>
      {tool.status === 'coming-soon' && <div className="mb-4"><ComingSoonNotice reason={tool.comingSoonReason} /></div>}
      {tool.status === 'experimental' && <ExperimentalNotice note={EXPERIMENTAL_NOTE} />}
      <Suspense fallback={<div className="py-12 text-center text-sm text-ink/40">Loading tool…</div>}>
        {Component ? <Component /> : null}
      </Suspense>
    </ToolPageShell>
  );
}
