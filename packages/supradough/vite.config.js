import { defineConfig } from 'vite';
import { dependencies } from './package.json' assert { type: 'json' };
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import bundleAudioWorkletPlugin from 'vite-plugin-bundle-audioworklet';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [bundleAudioWorkletPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, 'index.mjs'),
      formats: ['es'],
      fileName: (ext) => ({ es: 'index.mjs', cjs: 'index.cjs' })[ext],
    },
    rollupOptions: {
      external: [...Object.keys(dependencies)],
    },
    target: 'esnext',
  },
});

