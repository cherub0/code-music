import { expect, test, type Download, type Locator, type Page } from '@playwright/test';
import path from 'node:path';
import { loadBuiltInDemo, observeExternalRequests, seekToAct } from './app-driver';

async function byteLength(download: Download): Promise<number> {
  const stream = await download.createReadStream();
  let total = 0;
  for await (const chunk of stream) total += Buffer.byteLength(chunk);
  return total;
}

async function downloadResult(page: Page, link: Locator, expectedMime: RegExp) {
  const mimeType = await link.evaluate(async (element) => {
    const response = await fetch((element as HTMLAnchorElement).href);
    return response.headers.get('content-type');
  });
  expect(mimeType).toMatch(expectedMime);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    link.click(),
  ]);
  expect(await byteLength(download)).toBeGreaterThan(0);
  return download;
}

async function startExport(page: Page, resolution: '720p' | '1080p', format: 'webm' | 'mp4') {
  await page.getByLabel('Export resolution').selectOption(resolution);
  await page.getByLabel('Export format').selectOption(format);
  await page.getByRole('button', { name: 'Start export' }).click();
  return page.getByRole('link', { name: format === 'mp4' ? 'Download MP4' : 'Download WebM' });
}

test('exports the short local fixture as a non-empty 720p WebM and restores preview', async ({ page }) => {
  test.setTimeout(60_000);
  const externalRequests = observeExternalRequests(page);
  await page.goto('/');
  await page.getByLabel('选择音乐文件').setInputFiles(path.resolve('public/demo/demo.ogg'));
  await page.getByLabel('选择 MIDI 文件').setInputFiles(path.resolve('public/demo/demo.mid'));
  await page.getByRole('button', { name: '启动演出' }).click();
  await expect(page.getByRole('button', { name: 'Start export' })).toBeEnabled();
  await expect(page.getByLabel('Export resolution')).toHaveValue('720p');
  await expect(page.getByLabel('Export format')).toHaveValue('webm');

  const link = await startExport(page, '720p', 'webm');
  await expect(link).toBeVisible({ timeout: 30_000 });
  const download = await downloadResult(page, link, /^video\/webm(?:;|$)/);
  expect(download.suggestedFilename()).toMatch(/^demo-720p-\d{8}T\d{6}\.webm$/);

  await expect(page.getByRole('button', { name: 'Start export' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Play performance' })).toBeEnabled();
  expect(await page.getByLabel('Holographic performance stage').evaluate((element) => ({
    height: element.style.height,
    minHeight: element.style.minHeight,
    width: element.style.width,
  }))).toEqual({ height: '', minHeight: '', width: '' });
  expect(externalRequests, 'export must not upload the built-in/local media').toEqual([]);
});

test('@extended @manual accepts local files and rebuilds all four acts', async ({ page }) => {
  test.setTimeout(60_000);
  const externalRequests = observeExternalRequests(page);
  await page.goto('/');
  await page.getByLabel('选择音乐文件').setInputFiles(path.resolve('public/demo/demo.ogg'));
  await page.getByLabel('选择 MIDI 文件').setInputFiles(path.resolve('public/demo/demo.mid'));
  await page.getByRole('button', { name: '启动演出' }).click();
  await expect(page.getByRole('button', { name: 'Start export' })).toBeEnabled();

  await page.getByRole('button', { name: 'Play performance' }).click();
  await expect(page.getByRole('button', { name: 'Pause performance' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause performance' }).click();
  for (const act of ['boot', 'fracture', 'assemble', 'perform'] as const) await seekToAct(page, act);
  expect(externalRequests, 'local-file acceptance must not upload audio or MIDI').toEqual([]);
});

test('@extended @manual exports a non-empty 1080p WebM and restores preview', async ({ page }) => {
  test.setTimeout(90_000);
  const externalRequests = observeExternalRequests(page);
  await loadBuiltInDemo(page);
  const webm = await startExport(page, '1080p', 'webm');
  await expect(webm).toBeVisible({ timeout: 60_000 });
  await downloadResult(page, webm, /^video\/webm(?:;|$)/);
  await expect(page.getByRole('button', { name: 'Start export' })).toBeEnabled();
  expect(externalRequests, '1080p export must not upload audio or MIDI').toEqual([]);
});

test('@extended @manual lazily transcodes a non-empty 720p MP4 and restores preview', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const externalRequests = observeExternalRequests(page);
  await loadBuiltInDemo(page);
  const mp4 = await startExport(page, '720p', 'mp4');
  await expect(mp4).toBeVisible({ timeout: 5 * 60_000 });
  await downloadResult(page, mp4, /^video\/mp4(?:;|$)/);
  await expect(page.getByRole('button', { name: 'Start export' })).toBeEnabled();
  expect(externalRequests, 'MP4 transcode must keep audio and MIDI in-browser').toEqual([]);
});
