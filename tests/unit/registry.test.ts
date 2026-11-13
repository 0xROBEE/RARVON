import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tools, categories, actionMeta, popularToolKeys, relatedTools } from '../../src/lib/toolRegistry';

const root = join(import.meta.dirname, '../../src');
const componentsSource = readFileSync(join(root, 'lib/toolComponents.tsx'), 'utf8');
const registeredKeys = new Set([...componentsSource.matchAll(/'([a-z-]+\/[a-z0-9-]+)':\s*lazy/g)].map((m) => m[1]));

describe('tool registry', () => {
  it('has unique category/slug keys', () => {
    const keys = tools.map((t) => `${t.category}/${t.slug}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('only uses known categories and actions', () => {
    const cats = new Set(categories.map((c) => c.slug));
    const actions = new Set(actionMeta.map((a) => a.value));
    for (const t of tools) {
      expect(cats.has(t.category), `${t.slug} category`).toBe(true);
      expect(t.actions.length, `${t.slug} actions`).toBeGreaterThan(0);
      for (const a of t.actions) expect(actions.has(a), `${t.slug} action ${a}`).toBe(true);
    }
  });

  it('gives every usable tool a lazy component and a source folder', () => {
    for (const t of tools.filter((x) => x.status !== 'coming-soon')) {
      const key = `${t.category}/${t.slug}`;
      expect(registeredKeys.has(key), `${key} missing from toolComponents.tsx`).toBe(true);
      expect(statSync(join(root, 'tools', t.category, t.slug, 'index.tsx')).isFile()).toBe(true);
    }
  });

  it('has no component registered for an unknown tool', () => {
    const known = new Set(tools.map((t) => `${t.category}/${t.slug}`));
    for (const key of registeredKeys) expect(known.has(key), `${key} has no registry entry`).toBe(true);
  });

  it('has no orphan tool folders', () => {
    for (const cat of readdirSync(join(root, 'tools'))) {
      for (const slug of readdirSync(join(root, 'tools', cat))) {
        expect(registeredKeys.has(`${cat}/${slug}`), `src/tools/${cat}/${slug} is not registered`).toBe(true);
      }
    }
  });

  it('gives coming-soon tools a reason and popular tools a real target', () => {
    for (const t of tools.filter((x) => x.status === 'coming-soon')) expect(t.comingSoonReason).toBeTruthy();
    const known = new Set(tools.map((t) => `${t.category}/${t.slug}`));
    for (const key of popularToolKeys) expect(known.has(key), key).toBe(true);
  });

  it('relatedTools never includes the tool itself or coming-soon tools', () => {
    for (const t of tools) {
      for (const r of relatedTools(t)) {
        expect(r === t).toBe(false);
        expect(r.status).not.toBe('coming-soon');
      }
    }
  });
});
