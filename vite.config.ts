import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Produces a single, self-contained dist/index.html (CSS + JS inlined) that can
// be dropped onto a static S3 site or opened directly from disk.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
  },
});
