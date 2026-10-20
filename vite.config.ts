import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { version } from './package.json';

// PWA support (vite-plugin-pwa) arrives in Sprint 10 — Implementation Plan §4.
export default defineConfig({
  plugins: [react()],
  // Shown on the About screen (UI-3).
  define: { __APP_VERSION__: JSON.stringify(version) },
});
