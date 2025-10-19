import { defineConfig } from 'vite';
import { createRequire } from 'module';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import bundleAudioWorkletPlugin from 'vite-plugin-bundle-audioworklet';

const require = createRequire(import.meta.url);
const { dependencies } = require('./package.json');
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

