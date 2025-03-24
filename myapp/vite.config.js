import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// server: {
	// 	host: true,
	// 	port: 3000,
	// 	proxy: {},
	// 	hmr: {
	// 		clientPort: 3000
	// 	},
	// 	strictPort: false,
	// 	watch: {
	// 		usePolling: true
	// 	},
	// 	fs: {
	// 		strict: false
	// 	},
	// 	allowedHosts: [
	// 		'localhost',
	// 		'127.0.0.1',
	// 		'.ngrok-free.app',
	// 		'.ngrok.io',
	// 		'c716-112-170-63-146.ngrok-free.app'
	// 	]
	// }
});
