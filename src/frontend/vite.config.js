import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    })
  ],
  resolve: {
    alias: {
      declarations: path.resolve(__dirname, '../declarations'),
      '@dfinity/agent': path.resolve(__dirname, 'node_modules/@dfinity/agent'),
      '@dfinity/candid': path.resolve(__dirname, 'node_modules/@dfinity/candid'),
      '@dfinity/principal': path.resolve(__dirname, 'node_modules/@dfinity/principal'),
    }
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss(), // Use Tailwind CSS
        autoprefixer(), // Add autoprefixer
      ]
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: [
      '@dfinity/agent',
      '@dfinity/candid',
      '@dfinity/principal'
    ]
  },
  define: {
    global: 'window'
  }
});