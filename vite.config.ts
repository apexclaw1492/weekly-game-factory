import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Relative paths allow bundle to be served from any subdirectory (such as /weekly-game-factory/)
  build: {
    assetsInlineLimit: 10000000, // Inline assets to avoid load issues
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
});
