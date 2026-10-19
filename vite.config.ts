import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// PWA support (vite-plugin-pwa) arrives in Sprint 10 — Implementation Plan §4.
export default defineConfig({
  plugins: [react()],
});
