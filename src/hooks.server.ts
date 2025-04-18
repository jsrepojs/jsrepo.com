import { dev } from '$app/environment';
import { auth } from '$lib/auth';
import { postHogClient } from '$lib/ts/posthog';
import { svelteKitHandler } from 'better-auth/svelte-kit';

export async function handle({ event, resolve }) {
	return svelteKitHandler({ event, resolve, auth });
}

export async function handleError({ error, status }) {
	if (status !== 404) {
		if (dev) {
			console.error(error);
		}

		postHogClient.captureException(error);
		await postHogClient.shutdown();
	}
}
