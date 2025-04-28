import { dev } from '$app/environment';
import { auth } from '$lib/auth';
import { posthog } from '$lib/ts/posthog';
import { svelteKitHandler } from 'better-auth/svelte-kit';

export async function handle({ event, resolve }) {
	event.locals.auth = () => auth.api.getSession({ headers: event.request.headers });

	return svelteKitHandler({ event, resolve, auth });
}

export async function handleError({ error, status }) {
	if (status !== 404) {
		if (dev) {
			console.error(error);
		} else {
			posthog.captureException(error);
			await posthog.shutdown();
		}
	}
}
