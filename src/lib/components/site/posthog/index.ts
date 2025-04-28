import { browser } from '$app/environment';
import posthog from 'posthog-js';

export function initPosthog(token: string, api_host = 'https://us.i.posthog.com') {
	if (browser) {
		posthog.init(token, {
			api_host,
			capture_pageview: false,
			capture_pageleave: false
		});
	}
}

export { default as Posthog } from './posthog.svelte';
