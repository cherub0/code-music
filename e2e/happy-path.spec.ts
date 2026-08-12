import { expect, test } from '@playwright/test';
import {
  loadBuiltInDemo,
  observeExternalRequests,
  seekToAct,
  type PerformanceAct,
} from './app-driver';

const ACTS: PerformanceAct[] = ['boot', 'fracture', 'assemble', 'perform'];

test('built-in demo plays and rebuilds every act after an absolute seek', async ({ page }, testInfo) => {
  const externalRequests = observeExternalRequests(page);
  await loadBuiltInDemo(page);

  await page.getByRole('button', { name: 'Play performance' }).click();
  await expect(page.getByRole('button', { name: 'Pause performance' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause performance' }).click();

  for (const act of ACTS) {
    await seekToAct(page, act);
    await page.getByLabel('Holographic performance stage').screenshot({
      animations: 'disabled',
      path: testInfo.outputPath(`act-${act}.png`),
    });
  }

  expect(externalRequests, 'audio and MIDI must remain on the local app origin').toEqual([]);
});

test('@extended @performance records the 1080p preview budget after warm-up', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const externalRequests = observeExternalRequests(page);
  await loadBuiltInDemo(page);
  await page.getByLabel('Preview Quality').selectOption('High');
  await seekToAct(page, 'perform');

  const canvas = page.locator('[data-act="perform"] canvas');
  await expect(canvas).toHaveAttribute('data-draw-calls', /\d+/);
  await page.waitForTimeout(2_000);

  const browserSample = await page.evaluate(async () => {
    type MemoryPerformance = Performance & {
      memory?: { usedJSHeapSize: number };
    };
    const memoryPerformance = performance as MemoryPerformance;
    let frames = 0;
    let peakHeapBytes = memoryPerformance.memory?.usedJSHeapSize ?? null;
    const startedAt = performance.now();
    const sampleForMs = 3_000;

    await new Promise<void>((resolve) => {
      const sample = (timestamp: number) => {
        frames += 1;
        const heap = memoryPerformance.memory?.usedJSHeapSize;
        if (heap !== undefined) peakHeapBytes = Math.max(peakHeapBytes ?? 0, heap);
        if (timestamp - startedAt >= sampleForMs) resolve();
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });

    const elapsedMs = performance.now() - startedAt;
    return {
      averageFps: frames / (elapsedMs / 1_000),
      elapsedMs,
      frames,
      peakHeapBytes,
    };
  });

  const rendererSample = await canvas.evaluate((element) => ({
    drawCalls: Number(element.dataset.drawCalls),
    geometries: Number(element.dataset.geometries),
    textures: Number(element.dataset.textures),
  }));

  const seekSamples: Array<{ geometries: number; textures: number }> = [];
  for (let cycle = 0; cycle < 5; cycle += 1) {
    await seekToAct(page, 'boot');
    await seekToAct(page, 'perform');
    seekSamples.push(await canvas.evaluate((element) => ({
      geometries: Number(element.dataset.geometries),
      textures: Number(element.dataset.textures),
    })));
  }

  const loadedScripts = await page.evaluate(() => [...new Set([
    ...Array.from(document.scripts, (script) => script.src).filter(Boolean),
    ...performance
      .getEntriesByType('resource')
      .filter((entry) => (entry as PerformanceResourceTiming).initiatorType === 'script')
      .map((entry) => entry.name),
  ])]);
  const metrics = { browserSample, rendererSample, seekSamples, loadedScripts };
  await testInfo.attach('performance-budget.json', {
    body: JSON.stringify(metrics, null, 2),
    contentType: 'application/json',
  });
  console.log(`PERFORMANCE_BUDGET ${JSON.stringify(metrics)}`);

  const growsMonotonically = (values: number[]) => values.at(-1)! > values[0]
    && values.every((value, index) => index === 0 || value >= values[index - 1]);

  expect(browserSample.averageFps).toBeGreaterThanOrEqual(50);
  expect(rendererSample.drawCalls).toBeGreaterThan(1);
  expect(rendererSample.drawCalls).toBeLessThanOrEqual(120);
  expect(growsMonotonically(seekSamples.map((sample) => sample.geometries))).toBe(false);
  expect(growsMonotonically(seekSamples.map((sample) => sample.textures))).toBe(false);
  expect(loadedScripts.length).toBeGreaterThan(0);
  expect(loadedScripts.some((url) => /ffmpeg|814\.js|worker/i.test(url))).toBe(false);
  expect(externalRequests, 'the performance probe must not upload local media').toEqual([]);
});
