import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		allowedHosts: ['b823-2603-8081-5a40-91-fcde-2ca9-3b95-7f89.ngrok-free.app']
	}
});
