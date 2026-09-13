import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist',
    rollupOptions: {
      external: ['express', 'discord.js', 'dotenv'],
    },
  },
});
