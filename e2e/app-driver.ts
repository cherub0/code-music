import { expect, type Page } from '@playwright/test';

export type PerformanceAct = 'boot' | 'fracture' | 'assemble' | 'perform';

const SHORT_TRACK_BOUNDARY_RATIOS: Record<PerformanceAct, number> = {
  boot: 0,
  fracture: 0.2,
  assemble: 0.5,
  perform: 0.8,
};

export async function loadBuiltInDemo(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load built-in demo' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Project Signal Etude loaded.' })).toBeVisible();
  await expect(page.getByLabel('Timeline position')).toBeEnabled();
  await expect(page.getByLabel('Holographic MIDI performance')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start export' })).toBeEnabled();
}

export async function seekToAct(page: Page, act: PerformanceAct): Promise<number> {
  const timeline = page.getByLabel('Timeline position');
  const duration = Number(await timeline.getAttribute('max'));
  expect(duration).toBeGreaterThan(0);

  const fixedBoundary = { boot: 0, fracture: 2, assemble: 5, perform: 8 }[act];
  const target = duration < 10
    ? duration * SHORT_TRACK_BOUNDARY_RATIOS[act]
    : fixedBoundary;

  await timeline.evaluate((element, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, target.toFixed(2));
  await expect(page.locator(`[data-act="${act}"]`)).toBeVisible();
  return target;
}

export function observeExternalRequests(page: Page): string[] {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol !== 'blob:' && url.origin !== 'http://127.0.0.1:4174') {
      externalRequests.push(request.url());
    }
  });
  return externalRequests;
}
