import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`        — обычная сборка в dist/ (для GitHub Pages)
// `npm run build:single` — всё в одном index.html (dist-single/)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
}));
