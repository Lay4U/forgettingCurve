import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    allowedHosts: [
      'localhost',
      '127.0.0.1'
    ]
  }
}); 