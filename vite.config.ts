import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function bundleGraphManifest(): Plugin {
  return {
    name: 'bundle-graph-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const outputs = Object.values(bundle);
      const assetFileNames = outputs
        .filter((output) => output.type === 'asset')
        .map((asset) => asset.fileName);
      const chunks = Object.fromEntries(outputs
        .filter((output) => output.type === 'chunk')
        .sort((left, right) => left.fileName.localeCompare(right.fileName))
        .map((chunk) => [chunk.fileName, {
          assetReferences: assetFileNames
            .filter((fileName) => chunk.code.includes(fileName))
            .sort(),
          dynamicImports: [...chunk.dynamicImports].sort(),
          imports: [...chunk.imports].sort(),
          isEntry: chunk.isEntry,
          modules: Object.keys(chunk.modules).sort(),
          referencedFiles: [...chunk.referencedFiles].sort(),
        }]));
      const assets = Object.fromEntries(outputs
        .filter((output) => output.type === 'asset')
        .sort((left, right) => left.fileName.localeCompare(right.fileName))
        .map((asset) => [asset.fileName, {
          originalFileNames: [...asset.originalFileNames].sort(),
        }]));

      this.emitFile({
        type: 'asset',
        fileName: '.vite/bundle-graph.json',
        source: `${JSON.stringify({ assets, chunks }, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  build: {
    manifest: true,
  },
  plugins: [react(), bundleGraphManifest()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
