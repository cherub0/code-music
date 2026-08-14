import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  loadBuiltInDemo,
  observeExternalRequests,
  seekToAct,
  type PerformanceAct,
} from './app-driver';

const ACTS: PerformanceAct[] = ['boot', 'fracture', 'assemble', 'perform'];

type ViteManifestEntry = {
  file: string;
  imports?: string[];
  isEntry?: boolean;
  src?: string;
};

type BundleGraph = {
  assets: Record<string, { originalFileNames: string[] }>;
  chunks: Record<string, {
    assetReferences: string[];
    dynamicImports: string[];
    imports: string[];
    isEntry: boolean;
    modules: string[];
    referencedFiles?: string[];
  }>;
};

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

function isFfmpegModule(id: string): boolean {
  return /(?:^|\/)node_modules\/@ffmpeg\/(?:ffmpeg|core|util)(?:\/|$|\?)/i.test(id.replaceAll('\\', '/'));
}

async function builtBundleProof() {
  const [manifest, graph] = await Promise.all([
    readJson<Record<string, ViteManifestEntry>>(path.resolve('dist/.vite/manifest.json')),
    readJson<BundleGraph>(path.resolve('dist/.vite/bundle-graph.json')),
  ]);
  expect(manifest, 'Vite build manifest must be emitted').not.toBeNull();
  expect(graph, 'module-level bundle graph must be emitted').not.toBeNull();

  const buildManifest = manifest!;
  const bundleGraph = graph!;
  const entry = buildManifest['index.html']
    ?? Object.values(buildManifest).find((candidate) => candidate.isEntry);
  expect(entry, 'index.html must resolve to the production entry chunk').toBeDefined();

  const staticFiles = new Set<string>();
  const visitStaticChunk = (file: string) => {
    if (staticFiles.has(file)) return;
    const chunk = bundleGraph.chunks[file];
    expect(chunk, `static chunk ${file} must exist in the module graph`).toBeDefined();
    staticFiles.add(file);
    [...chunk.assetReferences, ...(chunk.referencedFiles ?? [])]
      .forEach((asset) => staticFiles.add(asset));
    chunk.imports.forEach(visitStaticChunk);
  };
  visitStaticChunk(entry!.file);

  const staticModules = [...staticFiles]
    .filter((file) => file in bundleGraph.chunks)
    .flatMap((file) => bundleGraph.chunks[file].modules);
  const ffmpegChunks = Object.entries(bundleGraph.chunks)
    .filter(([, chunk]) => chunk.modules.some(isFfmpegModule));
  const deferredFfmpegFiles = [...new Set([
    ...ffmpegChunks.map(([file]) => file),
    ...ffmpegChunks.flatMap(([, chunk]) => chunk.assetReferences),
    ...ffmpegChunks.flatMap(([, chunk]) => chunk.referencedFiles ?? []),
    ...Object.entries(bundleGraph.assets)
      .filter(([file, asset]) => isFfmpegModule(file) || asset.originalFileNames.some(isFfmpegModule))
      .map(([file]) => file),
  ])];
  const emittedFfmpegRuntimeFiles = [
    ...Object.keys(bundleGraph.chunks),
    ...Object.keys(bundleGraph.assets),
  ].filter((file) => /(?:^|\/)(?:worker|ffmpeg-core)-[^/]+\.(?:js|wasm)$/i.test(file));

  return {
    deferredFfmpegFiles,
    emittedFfmpegRuntimeFiles,
    entryFile: entry!.file,
    staticFiles: [...staticFiles],
    staticModules,
  };
}

test('built-in demo plays and rebuilds every act after an absolute seek', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const externalRequests = observeExternalRequests(page);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await loadBuiltInDemo(page);
  await expect(page.locator('[data-cinematic-stage="true"]')).toBeVisible();

  await page.getByRole('button', { name: 'Play performance' }).click();
  await expect(page.getByRole('button', { name: 'Pause performance' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause performance' }).click();

  const canvas = page.locator('[data-cinematic-stage="true"] canvas');
  const semanticTelemetry: Record<PerformanceAct, {
    activeNoteTrails: number;
    fractureInFrustum: boolean;
    monolithInFrustum: boolean;
  }> = {} as Record<PerformanceAct, {
    activeNoteTrails: number;
    fractureInFrustum: boolean;
    monolithInFrustum: boolean;
  }>;
  for (const act of ACTS) {
    await seekToAct(page, act);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    semanticTelemetry[act] = await canvas.evaluate((element) => ({
      activeNoteTrails: Number(element.dataset.activeNoteTrails),
      fractureInFrustum: element.dataset.fractureInFrustum === 'true',
      monolithInFrustum: element.dataset.monolithInFrustum === 'true',
    }));
    await page.getByLabel('Holographic performance stage').screenshot({
      animations: 'disabled',
      path: testInfo.outputPath(`act-${act}.png`),
    });
  }

  expect(semanticTelemetry.boot.monolithInFrustum, 'ACT01 code wall must occupy the camera frustum').toBe(true);
  expect(semanticTelemetry.fracture.fractureInFrustum, 'ACT02 shard field must occupy the camera frustum').toBe(true);
  expect(semanticTelemetry.assemble.fractureInFrustum, 'ACT03 assembling shards must remain in the camera frustum').toBe(true);
  expect(semanticTelemetry.perform.activeNoteTrails, 'ACT04 must render at least one currently sounding short trail').toBeGreaterThan(0);
  await expect(canvas).toHaveAttribute('data-draw-calls', /[1-9]\d*/);
  await expect(canvas).toHaveAttribute('data-city-layers', '1');
  await expect(canvas).toHaveAttribute('data-note-flight-layers', '1');

  await seekToAct(page, 'perform');
  const performTelemetry = await canvas.evaluate((element) => ({
    cameraPose: element.dataset.cameraPose ?? '',
    cityLayers: Number(element.dataset.cityLayers),
    geometries: Number(element.dataset.geometries),
    instancedPools: Number(element.dataset.instancedPools),
    cityPools: Number(element.dataset.cityPools),
    noteFlightPools: Number(element.dataset.noteFlightPools),
    noteFlightLayers: Number(element.dataset.noteFlightLayers),
    textures: Number(element.dataset.textures),
  }));
  const pose = performTelemetry.cameraPose.split(',').map(Number);
  expect(pose).toHaveLength(7);
  expect(Math.abs(pose[0] - pose[3]), 'ACT04 camera must keep a visible lateral oblique offset').toBeGreaterThan(2);
  expect(Math.abs(pose[1] - pose[4]), 'ACT04 camera must keep a visible elevated oblique offset').toBeGreaterThan(1);
  expect(performTelemetry.cityLayers).toBe(1);
  expect(performTelemetry.noteFlightLayers).toBe(1);
  expect(performTelemetry.instancedPools).toBeGreaterThan(0);
  expect(performTelemetry.cityPools).toBeGreaterThan(0);
  expect(performTelemetry.noteFlightPools).toBeGreaterThan(0);
  const horizontalYaw = Math.atan2(Math.abs(pose[3] - pose[0]), pose[5] - pose[2]) * 180 / Math.PI;
  expect(horizontalYaw).toBeGreaterThanOrEqual(27);
  expect(horizontalYaw).toBeLessThanOrEqual(33);

  const warmedSnapshots = [];
  for (let cycle = 0; cycle < 5; cycle += 1) {
    await seekToAct(page, cycle % 2 === 0 ? 'boot' : 'fracture');
    await seekToAct(page, 'perform');
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    warmedSnapshots.push(await canvas.evaluate((element) => ({
      cityLayers: Number(element.dataset.cityLayers),
      geometries: Number(element.dataset.geometries),
      instancedPools: Number(element.dataset.instancedPools),
      cityPools: Number(element.dataset.cityPools),
      noteFlightPools: Number(element.dataset.noteFlightPools),
      noteFlightLayers: Number(element.dataset.noteFlightLayers),
      textures: Number(element.dataset.textures),
    })));
  }
  expect(warmedSnapshots).toEqual(Array.from({ length: 5 }, () => ({
    cityLayers: performTelemetry.cityLayers,
    geometries: performTelemetry.geometries,
    instancedPools: performTelemetry.instancedPools,
    cityPools: performTelemetry.cityPools,
    noteFlightPools: performTelemetry.noteFlightPools,
    noteFlightLayers: performTelemetry.noteFlightLayers,
    textures: performTelemetry.textures,
  })));
  expect(pageErrors).toEqual([]);

  expect(externalRequests, 'audio and MIDI must remain on the local app origin').toEqual([]);
});

test('@extended @performance keeps every FFmpeg module outside the initial static graph', async () => {
  const proof = await builtBundleProof();

  expect(proof.staticModules.filter(isFfmpegModule)).toEqual([]);
  expect(proof.deferredFfmpegFiles.length, 'the graph must identify the deferred FFmpeg implementation').toBeGreaterThan(0);
  expect(proof.deferredFfmpegFiles.some((file) => file.endsWith('.wasm')), 'the graph must classify the FFmpeg WASM asset').toBe(true);
  expect(proof.emittedFfmpegRuntimeFiles.filter((file) => !proof.deferredFfmpegFiles.includes(file)), 'every emitted FFmpeg worker/core asset must remain deferred').toEqual([]);
  expect(proof.staticFiles.filter((file) => proof.deferredFfmpegFiles.includes(file))).toEqual([]);
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
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    seekSamples.push(await canvas.evaluate((element) => ({
      geometries: Number(element.dataset.geometries),
      textures: Number(element.dataset.textures),
    })));
  }

  const initialResourceUrls = await page.evaluate(() => [...new Set([
    ...Array.from(document.scripts, (script) => script.src).filter(Boolean),
    ...performance
      .getEntriesByType('resource')
      .map((entry) => entry.name),
  ])]);
  const bundleProof = await builtBundleProof();
  const requestedFfmpegFiles = initialResourceUrls.filter((url) => {
    const pathname = new URL(url).pathname.replace(/^\//, '');
    return bundleProof.deferredFfmpegFiles.includes(pathname);
  });
  const metrics = {
    browserSample,
    rendererSample,
    seekSamples,
    bundle: {
      deferredFfmpegFiles: bundleProof.deferredFfmpegFiles,
      entryFile: bundleProof.entryFile,
      initialResourceUrls,
      initialStaticFiles: bundleProof.staticFiles,
    },
  };
  await testInfo.attach('performance-budget.json', {
    body: JSON.stringify(metrics, null, 2),
    contentType: 'application/json',
  });
  console.log(`PERFORMANCE_BUDGET ${JSON.stringify(metrics)}`);

  expect(browserSample.averageFps).toBeGreaterThanOrEqual(50);
  expect(rendererSample.drawCalls).toBeGreaterThan(1);
  expect(rendererSample.drawCalls).toBeLessThanOrEqual(120);
  expect(seekSamples).toEqual(Array.from({ length: 5 }, () => ({
    geometries: rendererSample.geometries,
    textures: rendererSample.textures,
  })));
  expect(initialResourceUrls.length).toBeGreaterThan(0);
  expect(requestedFfmpegFiles, 'no deferred FFmpeg chunk, worker, core, or WASM may load before MP4').toEqual([]);
  expect(externalRequests, 'the performance probe must not upload local media').toEqual([]);
});
