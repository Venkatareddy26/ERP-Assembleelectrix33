import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig(({ mode }) => {
  const hosted = mode === 'hosted' || process.env.VERCEL === '1';
  return {
    plugins: [react(), tailwindcss()],
    define: { 'import.meta.env.VITE_STORAGE_MODE': JSON.stringify(hosted ? 'browser' : 'server') },
    build: { outDir: hosted ? 'dist-hosted' : 'dist' },
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { host: '127.0.0.1', port: 3000, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3001' } },
  };
});
