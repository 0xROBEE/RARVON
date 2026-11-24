// Builds Rarvon for desktop for Linux, on Windows or Linux:
//   1. the website (dist) and the Rarvon Engine for Linux (static musl program),
//   2. desktop/stage-linux/root: the files as they are installed (/opt/rarvon, menu entry, icons),
//   3. desktop/out: rarvon_<v>_amd64.deb (Debian, Ubuntu, Mint…),
//      rarvon-<v>-1.x86_64.rpm (Fedora, openSUSE…) and rarvon-<v>-linux-x86_64.tar.gz (any Linux).
// Needs: rustup target x86_64-unknown-linux-musl, cargo install cargo-generate-rpm,
// and FFmpeg for Linux in desktop/bench-engine/ffmpeg-linux (see desktop/README.md).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, cpSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, writeSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = process.cwd();
const engine = join(root, 'desktop', 'bench-engine');
const linux = join(root, 'desktop', 'linux');
const stage = join(root, 'desktop', 'stage-linux');
const out = join(root, 'desktop', 'out');
const target = 'x86_64-unknown-linux-musl';
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });

const version = /^version\s*=\s*"([^"]+)"/m.exec(readFileSync(join(engine, 'Cargo.toml'), 'utf8'))[1];
const ffmpeg = join(engine, 'ffmpeg-linux', 'ffmpeg');
if (!existsSync(ffmpeg)) throw new Error(`FFmpeg for Linux is missing: ${ffmpeg} (see desktop/README.md)`);
const mtime = Number(process.env.SOURCE_DATE_EPOCH ?? Math.floor(Date.now() / 1000));

if (!process.argv.includes('--skip-site')) run('npm', ['run', 'build']);
// From the engine folder, so its .cargo/config.toml (the Linux linker) applies.
run('cargo', ['build', '--release', '--target', target], { cwd: engine });

// ---- 2. The installed files ----
rmSync(stage, { recursive: true, force: true });
const files = join(stage, 'root');
const opt = join(files, 'opt', 'rarvon');
mkdirSync(join(opt, 'ffmpeg'), { recursive: true });
mkdirSync(join(opt, 'licenses'), { recursive: true });
cpSync(join(engine, 'target', target, 'release', 'bench-engine'), join(opt, 'rarvon'));
cpSync(join(root, 'dist'), join(opt, 'web'), {
  recursive: true,
  // The app serves the pages itself: no offline cache or web-host settings needed.
  filter: (src) => !/[\\/](sw\.js|_headers|_redirects)$/.test(src),
});
cpSync(ffmpeg, join(opt, 'ffmpeg', 'ffmpeg'));
cpSync(join(engine, 'ffmpeg-linux', 'LICENSE.txt'), join(opt, 'ffmpeg', 'LICENSE.txt'));
cpSync(join(linux, 'license.txt'), join(opt, 'LICENSE.txt'));
run('node', [join(root, 'scripts', 'rust-licenses.mjs'), join(opt, 'licenses', 'rust-crates.txt'), '--target', target], { shell: false });

mkdirSync(join(files, 'usr', 'bin'), { recursive: true });
cpSync(join(linux, 'rarvon'), join(files, 'usr', 'bin', 'rarvon'));
mkdirSync(join(files, 'usr', 'share', 'applications'), { recursive: true });
cpSync(join(linux, 'rarvon.desktop'), join(files, 'usr', 'share', 'applications', 'rarvon.desktop'));
const icons = join(root, 'design', 'brand', 'rarvon-final', 'png');
for (const size of [16, 24, 32, 48, 64, 128, 256, 512]) {
  const dir = join(files, 'usr', 'share', 'icons', 'hicolor', `${size}x${size}`, 'apps');
  mkdirSync(dir, { recursive: true });
  cpSync(join(icons, `rarvon-app-icon-${size}.png`), join(dir, 'rarvon.png'));
}
const scalable = join(files, 'usr', 'share', 'icons', 'hicolor', 'scalable', 'apps');
mkdirSync(scalable, { recursive: true });
cpSync(join(root, 'public', 'icons', 'rarvon-app-icon.svg'), join(scalable, 'rarvon.svg'));

/** Every file and folder under `dir`, as forward-slash paths, folders first. */
function walk(dir, base = dir) {
  const list = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const rel = relative(base, full).split('\\').join('/');
    if (statSync(full).isDirectory()) list.push({ rel, full, dir: true }, ...walk(full, base));
    else list.push({ rel, full, dir: false });
  }
  return list;
}
// Programs need the "run" permission (Windows doesn't keep it, so it is set here).
const runnable = (rel) => /(^|\/)(rarvon|ffmpeg|install\.sh)$/.test(rel);
const modeOf = (e) => (e.dir ? 0o755 : runnable(e.rel) ? 0o755 : 0o644);

// ---- A small tar writer (ustar), so permissions and owners are right on any build computer ----
function tarHeader(name, { size = 0, mode = 0o644, type = '0' }) {
  const h = Buffer.alloc(512);
  let prefix = '';
  if (Buffer.byteLength(name) > 100) {
    // ustar keeps long paths as "prefix/name": find a slash that splits them to fit.
    const at = [...name.matchAll(/\//g)].map((m) => m.index).find((i) => i > 0 && i <= 155 && Buffer.byteLength(name.slice(i + 1)) <= 100 && name.slice(i + 1) !== '');
    if (at === undefined) throw new Error(`Path too long for tar: ${name}`);
    prefix = name.slice(0, at);
    name = name.slice(at + 1);
  }
  const put = (text, at, len) => h.write(text, at, len, 'utf8');
  const oct = (n, at, len) => put(n.toString(8).padStart(len - 1, '0') + '\0', at, len);
  put(name, 0, 100);
  oct(mode, 100, 8);
  oct(0, 108, 8); // root
  oct(0, 116, 8);
  oct(size, 124, 12);
  oct(mtime, 136, 12);
  h.fill(' ', 148, 156);
  put(type, 156, 1);
  put('ustar\0', 257, 6);
  put('00', 263, 2);
  put('root', 265, 32);
  put('root', 297, 32);
  put(prefix, 345, 155);
  let sum = 0;
  for (const b of h) sum += b;
  put(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
  return h;
}
/** A .tar.gz of `entries` ({ name, full?, dir, mode }); returns its bytes. */
function tarGz(entries) {
  const parts = [];
  for (const e of entries) {
    if (e.dir) {
      parts.push(tarHeader(e.name.endsWith('/') ? e.name : `${e.name}/`, { mode: e.mode, type: '5' }));
      continue;
    }
    const data = e.data ?? readFileSync(e.full);
    parts.push(tarHeader(e.name, { size: data.length, mode: e.mode }), data);
    if (data.length % 512) parts.push(Buffer.alloc(512 - (data.length % 512)));
  }
  parts.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(parts));
}

const all = walk(files);
mkdirSync(out, { recursive: true });

// ---- 3a. .deb ----
const debFiles = all.map((e) => ({ name: `./${e.rel}`, full: e.full, dir: e.dir, mode: modeOf(e) }));
const sumsLines = [];
let installedBytes = 0;
for (const e of all.filter((x) => !x.dir)) {
  const data = readFileSync(e.full);
  installedBytes += data.length;
  sumsLines.push(`${createHash('md5').update(data).digest('hex')}  ${e.rel}`);
}
const control = `Package: rarvon
Version: ${version}
Architecture: amd64
Maintainer: ROBEE <https://github.com/ROBEE404>
Installed-Size: ${Math.ceil(installedBytes / 1024)}
Section: utils
Priority: optional
Homepage: https://github.com/ROBEE404/RARVON
Suggests: chromium | google-chrome-stable | microsoft-edge-stable
Description: Free tools for your files, on your own computer
 Rarvon for desktop (beta): PDFs, images, video, audio and text, with no
 ads, no account and nothing uploaded. Video and audio run in FFmpeg.
`;
const refresh = `#!/bin/sh
set -e
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q /usr/share/applications || true
command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
`;
const controlTar = tarGz([
  { name: './', dir: true, mode: 0o755 },
  { name: './control', data: Buffer.from(control), mode: 0o644 },
  { name: './md5sums', data: Buffer.from(sumsLines.join('\n') + '\n'), mode: 0o644 },
  { name: './postinst', data: Buffer.from(refresh), mode: 0o755 },
  { name: './postrm', data: Buffer.from(refresh), mode: 0o755 },
]);
const dataTar = tarGz(debFiles);
const debPath = join(out, `rarvon_${version}_amd64.deb`);
{
  // A .deb is an "ar" archive of three members.
  const fd = openSync(debPath, 'w');
  writeSync(fd, '!<arch>\n');
  for (const [name, data] of [['debian-binary', Buffer.from('2.0\n')], ['control.tar.gz', controlTar], ['data.tar.gz', dataTar]]) {
    const h = `${name.padEnd(16)}${String(mtime).padEnd(12)}${'0'.padEnd(6)}${'0'.padEnd(6)}${'100644'.padEnd(8)}${String(data.length).padEnd(10)}\`\n`;
    writeSync(fd, h);
    writeSync(fd, data);
    if (data.length % 2) writeSync(fd, '\n');
  }
  closeSync(fd);
}

// ---- 3b. .rpm (with cargo-generate-rpm) ----
const toml = (s) => JSON.stringify(s); // TOML basic strings use the same escapes as JSON here
const rpmMeta = [
  'name = "rarvon"',
  `version = ${toml(version)}`,
  'release = "1"',
  'license = "LicenseRef-Rarvon"',
  'summary = "Free tools for your files, on your own computer"',
  'url = "https://github.com/ROBEE404/RARVON"',
  'auto-req = "no"',
  `post_install_script = ${toml(refresh)}`,
  // The .rpm lists files, not folders: on a full removal ($1 = 0), take the empty folders too.
  `post_uninstall_script = ${toml(refresh + 'if [ "$1" = 0 ]; then rm -rf /opt/rarvon; fi\n')}`,
  'assets = [',
  ...all.filter((e) => !e.dir).map((e) => `  { source = ${toml(e.full.split('\\').join('/'))}, dest = ${toml('/' + e.rel)}, mode = "${modeOf(e).toString(8)}" },`),
  ']',
  '[suggests]',
  'chromium = "*"',
].join('\n');
const rpmToml = join(stage, 'rpm.toml');
writeFileSync(rpmToml, rpmMeta + '\n');
const rpmPath = join(out, `rarvon-${version}-1.x86_64.rpm`);
run('cargo', ['generate-rpm', '--arch', 'x86_64', '--metadata-overwrite', rpmToml, '-o', rpmPath, '--source-date', String(mtime)], { cwd: engine, shell: false });

// ---- 3c. .tar.gz (any Linux: unpack and run) ----
const folder = `rarvon-${version}-linux-x86_64`;
const optEntries = walk(opt).map((e) => ({ name: `${folder}/${e.rel}`, full: e.full, dir: e.dir, mode: modeOf(e) }));
const tarPath = join(out, `${folder}.tar.gz`);
writeFileSync(
  tarPath,
  tarGz([
    { name: `${folder}/`, dir: true, mode: 0o755 },
    ...optEntries,
    { name: `${folder}/rarvon.desktop`, full: join(linux, 'rarvon.desktop'), mode: 0o644 },
    { name: `${folder}/rarvon.png`, full: join(icons, 'rarvon-app-icon-256.png'), mode: 0o644 },
    { name: `${folder}/install.sh`, full: join(linux, 'install.sh'), mode: 0o755 },
    { name: `${folder}/README.txt`, full: join(linux, 'README.txt'), mode: 0o644 },
  ]),
);

for (const p of [debPath, rpmPath, tarPath]) console.log(`${p}  ${(statSync(p).size / 1024 / 1024).toFixed(1)} MB`);
