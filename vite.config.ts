import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/mtg-playtest-proxy/' : '/',
  plugins: [vue()],
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: ['node_modules'],
      },
    },
  },
}));
