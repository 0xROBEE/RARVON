import JSZip from 'jszip';
import exifr from 'exifr';
import { test, expect, upload, download, openTool, makeImage, makeWebm, makeWav, makePdf, imageSize, mediaInfo } from './helpers';
import type { UploadFile } from './helpers';

/** Inserts a minimal EXIF APP1 segment (Make + Model) right after the JPEG SOI marker. */
function withExif(jpeg: UploadFile, make = 'BenchCam', model = 'Model T'): UploadFile {
  const entries: [number, string][] = [[0x010f, make], [0x0110, model]];
  const ifdSize = 2 + entries.length * 12 + 4;
  const strings = entries.map(([, s]) => Buffer.from(`${s}\0`, 'latin1'));
  const tiff = Buffer.alloc(8 + ifdSize + strings.reduce((n, b) => n + b.length, 0));
  tiff.write('II', 0);
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(entries.length, 8);
  let dataOffset = 8 + ifdSize;
  entries.forEach(([tag], i) => {
    const at = 10 + i * 12;
    tiff.writeUInt16LE(tag, at);
    tiff.writeUInt16LE(2, at + 2); // ASCII
    tiff.writeUInt32LE(strings[i].length, at + 4);
    tiff.writeUInt32LE(dataOffset, at + 8);
    strings[i].copy(tiff, dataOffset);
    dataOffset += strings[i].length;
  });
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const header = Buffer.from([0xff, 0xe1, 0, 0]);
  header.writeUInt16BE(payload.length + 2, 2);
  return { ...jpeg, buffer: Buffer.concat([jpeg.buffer.subarray(0, 2), header, payload, jpeg.buffer.subarray(2)]) };
}

test.describe('image tools with real files', () => {
  test('convert JPEG to PNG and WebP', async ({ page }) => {
    await openTool(page, '/tools/image/convert');
    const src = await makeImage(page, { width: 900, height: 600 });
    for (const [mime, ext] of [['image/png', 'png'], ['image/webp', 'webp']] as const) {
      await upload(page, src);
      await page.getByLabel('Convert to').selectOption(mime);
      await page.getByRole('button', { name: 'Convert', exact: true }).click();
      const out = await download(page);
      expect(out.name).toMatch(new RegExp(`\\.${ext}$`));
      expect(await imageSize(page, out.buffer, mime)).toEqual({ width: 900, height: 600 });
      await page.getByRole('button', { name: 'Remove' }).click();
    }
  });

  test('compress a JPEG to a smaller file at the same size', async ({ page }) => {
    await openTool(page, '/tools/image/compress');
    const src = await makeImage(page, { width: 1600, height: 1200 });
    await upload(page, src);
    await page.locator('main input[type=range]').fill('0.4');
    await page.getByRole('button', { name: 'Compress', exact: true }).click();
    const out = await download(page);
    expect(out.buffer.length).toBeLessThan(src.buffer.length);
    expect(await imageSize(page, out.buffer, 'image/jpeg')).toEqual({ width: 1600, height: 1200 });
  });

  test('resize to exact width keeps aspect ratio', async ({ page }) => {
    await openTool(page, '/tools/image/resize');
    await upload(page, await makeImage(page, { width: 1200, height: 800 }));
    const width = page.locator('main input[type=number]').first();
    await width.fill('600');
    await page.getByRole('button', { name: 'Resize image' }).click();
    const out = await download(page, 'Download result');
    const size = await imageSize(page, out.buffer, out.name.endsWith('png') ? 'image/png' : 'image/jpeg');
    expect(size).toEqual({ width: 600, height: 400 });
  });

  test('crop to a dragged region', async ({ page }) => {
    await openTool(page, '/tools/image/crop');
    await upload(page, await makeImage(page, { width: 800, height: 600 }));
    const img = page.getByAltText('To crop');
    await expect(img).toBeVisible();
    const b = (await img.boundingBox())!;
    await page.mouse.move(b.x + b.width * 0.25, b.y + b.height * 0.25);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.75, b.y + b.height * 0.75, { steps: 6 });
    await page.mouse.up();
    await page.getByRole('button', { name: 'Crop', exact: true }).click();
    const out = await download(page);
    const size = await imageSize(page, out.buffer, 'image/jpeg');
    expect(size.width).toBeGreaterThan(380);
    expect(size.width).toBeLessThan(420);
    expect(size.height).toBeGreaterThan(280);
    expect(size.height).toBeLessThan(320);
  });

  test('rotate 90° swaps dimensions', async ({ page }) => {
    await openTool(page, '/tools/image/rotate');
    await upload(page, await makeImage(page, { width: 800, height: 500 }));
    await page.getByRole('button', { name: 'Rotate right 90°' }).click();
    await page.getByRole('button', { name: 'Apply and export' }).click();
    const out = await download(page);
    expect(await imageSize(page, out.buffer, 'image/jpeg')).toEqual({ width: 500, height: 800 });
  });

  test('metadata viewer shows EXIF camera make', async ({ page }) => {
    await openTool(page, '/tools/image/metadata');
    await upload(page, withExif(await makeImage(page, { width: 400, height: 300 })));
    await expect(page.locator('main')).toContainText('BenchCam');
  });

  test('remove metadata strips EXIF', async ({ page }) => {
    await openTool(page, '/tools/image/remove-metadata');
    const src = withExif(await makeImage(page, { width: 400, height: 300 }));
    expect((await exifr.parse(src.buffer))?.Make).toBe('BenchCam');
    await upload(page, src);
    await page.getByRole('button', { name: 'Remove metadata' }).click();
    const out = await download(page, 'Download result');
    expect(await exifr.parse(out.buffer).catch(() => undefined)).toBeFalsy();
  });
});

test.describe('ZIP', () => {
  test('File Compressor bundles files and de-duplicates names', async ({ page }) => {
    await openTool(page, '/tools/utilities/archive');
    const text = { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello '.repeat(2000)) };
    await upload(page, [text, { ...text, buffer: Buffer.from('second') }, await makePdf({ pages: 1 })]);
    await page.getByRole('button', { name: 'Create ZIP' }).click();
    const out = await download(page);
    const zip = await JSZip.loadAsync(out.buffer);
    const names = Object.keys(zip.files).sort();
    expect(names).toEqual(['notes (1).txt', 'notes.txt', 'page.pdf']);
    expect(await zip.file('notes.txt')!.async('string')).toBe('hello '.repeat(2000));
    expect(out.buffer.length).toBeLessThan(12000 + 1000); // text compressed well
  });
});

test.describe('video tools (WebCodecs via Mediabunny)', () => {
  test('trim shortens the clip', async ({ page }) => {
    await openTool(page, '/tools/video/trim');
    await upload(page, await makeWebm(page, 4));
    await page.getByLabel(/^End/).fill('2');
    await page.getByRole('button', { name: 'Trim video' }).click();
    const out = await download(page);
    const info = await mediaInfo(page, out.buffer, 'video/webm');
    expect(info.duration).toBeGreaterThan(1.5);
    expect(info.duration).toBeLessThan(2.6);
  });

  test('change resolution to 360p width/height', async ({ page }) => {
    await openTool(page, '/tools/video/resolution');
    await upload(page, await makeWebm(page, 2));
    const [w, h] = [page.locator('main input[type=number]').nth(0), page.locator('main input[type=number]').nth(1)];
    await w.fill('320');
    await h.fill('180');
    await page.getByRole('button', { name: 'Change resolution' }).click();
    const out = await download(page);
    const info = await mediaInfo(page, out.buffer, 'video/webm');
    expect([info.width, info.height]).toEqual([320, 180]);
  });

  test('convert WebM to MP4', async ({ page }) => {
    await openTool(page, '/tools/video/convert');
    await upload(page, await makeWebm(page, 2));
    await page.getByRole('button', { name: 'Convert to MP4' }).click();
    const out = await download(page);
    expect(out.name).toMatch(/\.mp4$/);
    expect(out.buffer.subarray(4, 8).toString('latin1')).toBe('ftyp');
    const info = await mediaInfo(page, out.buffer, 'video/mp4');
    expect(info.duration).toBeGreaterThan(1.5);
    expect([info.width, info.height]).toEqual([640, 360]);
  });

  test('compress produces a playable smaller video', async ({ page }) => {
    test.fail(true, 'Known issue (Task 5): quality presets ignore source bitrate, so low-bitrate input can grow');
    await openTool(page, '/tools/video/compress');
    const src = await makeWebm(page, 3);
    await upload(page, src);
    await page.getByRole('button', { name: 'Compress video' }).click();
    const out = await download(page);
    expect(out.buffer.length).toBeLessThan(src.buffer.length);
  });
});

test.describe('audio tools', () => {
  test('trim exports a shorter WAV', async ({ page }) => {
    await openTool(page, '/tools/audio/trim');
    await upload(page, makeWav(4));
    await page.getByLabel(/^End/).fill('1.5');
    await page.getByRole('button', { name: 'Trim & export as WAV' }).click();
    const out = await download(page);
    expect(out.buffer.subarray(0, 4).toString('latin1')).toBe('RIFF');
    const info = await mediaInfo(page, out.buffer, 'audio/wav');
    expect(info.duration).toBeCloseTo(1.5, 1);
  });

  test('convert to compressed WebM/Opus', async ({ page }) => {
    await openTool(page, '/tools/audio/convert');
    const src = makeWav(2);
    await upload(page, src);
    await page.locator('main').getByRole('button', { name: /WebM|Opus/ }).first().click();
    await page.getByRole('button', { name: 'Convert', exact: true }).click();
    const out = await download(page);
    expect(out.buffer.length).toBeLessThan(src.buffer.length);
    expect((await mediaInfo(page, out.buffer, 'audio/webm')).duration).toBeGreaterThan(1.5);
  });

  test('compress shrinks a WAV', async ({ page }) => {
    await openTool(page, '/tools/audio/compress');
    const src = makeWav(2);
    await upload(page, src);
    await page.getByRole('button', { name: 'Compress', exact: true }).click();
    const out = await download(page);
    expect(out.buffer.length).toBeLessThan(src.buffer.length / 4);
  });

  test('extract the soundtrack from a video', async ({ page }) => {
    await openTool(page, '/tools/audio/extract');
    await upload(page, await makeWebm(page, 2));
    await page.getByRole('button', { name: 'Extract audio' }).click();
    const out = await download(page);
    expect((await mediaInfo(page, out.buffer, 'audio/webm')).duration).toBeGreaterThan(1);
  });
});

test.describe('tool chaining', () => {
  test('a PDF result can be continued in another tool without re-uploading', async ({ page }) => {
    await openTool(page, '/tools/pdf/merge');
    await upload(page, [await makePdf({ pages: 2, label: 'A' }), await makePdf({ pages: 1, label: 'B' })]);
    await page.getByRole('button', { name: 'Merge PDFs' }).click();
    await expect(page.getByRole('button', { name: /Download/ })).toBeVisible();
    // Client-side navigation keeps the in-memory result.
    await page.getByRole('link', { name: 'Split PDF' }).first().click();
    await expect(page.getByText('Continue with merged.pdf')).toBeVisible();
    await page.getByRole('button', { name: 'Use this file' }).click();
    await expect(page.locator('main')).toContainText('merged.pdf');
    await page.getByRole('button', { name: 'Split PDF' }).click();
    const zip = await JSZip.loadAsync((await download(page)).buffer);
    expect(Object.keys(zip.files).filter((n) => n.endsWith('.pdf'))).toHaveLength(3);
  });

  test('a PDF result is not offered to an image tool', async ({ page }) => {
    await openTool(page, '/tools/pdf/merge');
    await upload(page, [await makePdf({ pages: 1, label: 'A' }), await makePdf({ pages: 1, label: 'B' })]);
    await page.getByRole('button', { name: 'Merge PDFs' }).click();
    await expect(page.getByRole('button', { name: /Download/ })).toBeVisible();
    await page.getByRole('link', { name: 'Image', exact: true }).first().click();
    await page.getByRole('link', { name: /Image Compressor/ }).first().click();
    await expect(page.locator('input[type=file]')).toBeAttached();
    await expect(page.getByText(/Continue with/)).toHaveCount(0);
  });
});
