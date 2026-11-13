# Contributing

Thanks for considering contributing.

## Adding a tool

1. Create `src/tools/<category>/<slug>/index.tsx` with a default-exported component.
2. Add its metadata (name, description, keywords, **actions**, status) to `src/lib/toolRegistry.ts`.
   Pick 1–3 entries from `ToolAction` (`convert`, `compress`, `edit`, `resize`, `extract`,
   `generate`, `optimize`, `analyze`) that describe the user's actual intent — this is what makes
   global search group "compress" across Image/Video/PDF/Audio together, so it's not optional
   metadata. Run `npx tsx scripts/verify-search.ts` after adding a tool to sanity-check it shows up
   for the queries you'd expect.
3. Register it in `src/lib/toolComponents.tsx` as a lazy import.
4. If it's genuinely impossible to run client-side, set `status: 'coming-soon'` and give a real,
   specific `comingSoonReason` — never a fake button or a silent upload.

## Ground rules

- **No uploads.** If a tool touches user files, it processes them in the browser. If that's not
  possible, it's Coming Soon, not faked.
- **No dark patterns.** No donation nags, no fake urgency, no gating basic tools.
- **Keep the homepage light.** Don't import a tool's processing library outside its own folder.
- **Check licenses.** Any new dependency should be MIT/Apache-2.0/BSD-compatible with a future
  commercial version.

## Reporting bugs / suggesting tools

Open an issue with steps to reproduce (for bugs) or a short description of the workflow you're
missing (for tool suggestions).
