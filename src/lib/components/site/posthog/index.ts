import { browser, dev } from '$app/environment';
import posthog, { type PostHogConfig } from 'posthog-js';

export function initPosthog(token: string, api_host = 'https://us.i.posthog.com') {
	if (browser) {
		let devSettings: Partial<PostHogConfig> = {};
		if (dev) {
			devSettings = {
				capture_exceptions: false
			};
		}

		posthog.init(token, {
			api_host,
			capture_pageview: false,
			capture_pageleave: false,
			...devSettings
		});
	}
}

export { default as Posthog } from './posthog.svelte';
