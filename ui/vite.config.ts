import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const port = Number(process.env.PORT) || 5173;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port,
    host: true,
    strictPort: true,
  },
  preview: {
    port,
    host: true,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
