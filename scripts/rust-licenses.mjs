// Collects the licence of every Rust crate compiled into Rarvon.exe (normal
// dependencies only; build-time helpers don't ship), with each crate's own
// licence files, so their copyright notices ship with the app.
//   node scripts/rust-licenses.mjs <output file> [--target <rust target>]
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const manifest = join(process.cwd(), 'desktop', 'bench-engine', 'Cargo.toml');
const out = process.argv[2] ?? join(process.cwd(), 'desktop', 'stage', 'licenses', 'rust-crates.txt');
const ti = process.argv.indexOf('--target');
const target = ti > 0 ? process.argv[ti + 1] : '';
const program = target.includes('linux') ? 'the rarvon program' : 'Rarvon.exe';
const cargo = (args) => execFileSync('cargo', [...args, '--manifest-path', manifest], { encoding: 'utf8' });

const shipped = new Set(
  cargo(['tree', '-e', 'normal', '--prefix', 'none', ...(target ? ['--target', target] : [])])
    .split('\n')
    .map((l) => l.trim().split(' ').slice(0, 2).join(' '))
    .filter((l) => l && !l.startsWith('bench-engine')),
);
const meta = JSON.parse(cargo(['metadata', '--format-version', '1']));
const parts = [
  `Rarvon for desktop: Rust libraries inside ${program}`,
  'Each library below remains under its own licence. Thank you to their authors.',
  '',
];
for (const p of meta.packages.sort((a, b) => a.name.localeCompare(b.name))) {
  if (!shipped.has(`${p.name} v${p.version}`)) continue;
  const dir = dirname(p.manifest_path);
  const files = readdirSync(dir).filter((f) => /^(licen[cs]e|copying|copyright|notice)/i.test(f));
  parts.push('='.repeat(78), `${p.name} ${p.version}`, `Licence: ${p.license}`, `Source: ${p.repository ?? 'https://crates.io/crates/' + p.name}`, '');
  for (const f of files) parts.push(`--- ${f} ---`, readFileSync(join(dir, f), 'utf8').trim(), '');
  if (!files.length) parts.push('(No licence file in the crate; licence as declared above.)', '');
}
if (target.includes('musl')) parts.push('='.repeat(78), 'musl (the C library built into the program)', 'Licence: MIT', 'Source: https://musl.libc.org', '', muslLicence(), '');
writeFileSync(out, parts.join('\n'));
console.log(`${shipped.size} crates written to ${out}`);

// The musl C library, statically linked into the Linux program.
function muslLicence() {
  return `Copyright © 2005-2020 Rich Felker, et al.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;
}
