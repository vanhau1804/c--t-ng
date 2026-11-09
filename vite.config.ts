/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Chạy `npm run build` để ra một tệp dist/index.html duy nhất (JS và CSS đã nhúng sẵn).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { target: 'es2020', cssCodeSplit: false },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}']
  }
});
