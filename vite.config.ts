import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		allowedHosts: ['e0b6-2603-8081-5a40-91-bd82-81ba-2998-ba50.ngrok-free.app']
	}
});
