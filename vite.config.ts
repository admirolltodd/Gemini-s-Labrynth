import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  const isElectron = process.env.ELECTRON === 'true';
  const isCapacitor = process.env.CAPACITOR === 'true';
  // Single file only for plain web builds — Capacitor and Electron need real file trees
  const isSingleFile = !isElectron && !isCapacitor;

  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      ...(isSingleFile ? [viteSingleFile()] : []),
      ...(isElectron && process.env.DISABLE_HMR !== 'true' ? [
        electron([
          {
            entry: 'electron/main.ts',
          },
          {
            entry: 'electron/preload.ts',
          },
        ]),
        renderer(),
      ] : []),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ""),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      assetsInlineLimit: 100000000, // Inline everything
      chunkSizeWarningLimit: 100000000,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
