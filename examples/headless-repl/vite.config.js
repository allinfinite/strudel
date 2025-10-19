import { defineConfig } from 'vite';
import bundleAudioWorkletPlugin from '../../packages/vite-plugin-bundle-audioworklet/vite-plugin-bundle-audioworklet.js';

export default defineConfig({
  plugins: [bundleAudioWorkletPlugin()],
});

