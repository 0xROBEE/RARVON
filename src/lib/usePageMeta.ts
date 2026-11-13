import { useEffect } from 'react';

const SITE_NAME = 'Bench';

function setMetaDescription(content: string) {
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', 'description');
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

/**
 * Sets document.title and the meta description tag for the current page.
 * Deliberately not a full SSR/head-management library (react-helmet etc.) —
 * this is a client-only SPA today, so a small effect is enough and avoids
 * an extra dependency. If server-side rendering is ever added, this is the
 * one place that would need to change.
 */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    const previousTitle = document.title;
    const previousDescriptionTag = document.querySelector('meta[name="description"]');
    const previousDescription = previousDescriptionTag?.getAttribute('content') ?? '';

    document.title = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
    setMetaDescription(description);

    return () => {
      document.title = previousTitle;
      setMetaDescription(previousDescription);
    };
  }, [title, description]);
}
