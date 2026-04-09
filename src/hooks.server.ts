import { dev } from '$app/environment';
import { auth } from '$lib/auth';
import { posthog } from '$lib/ts/posthog';
import { StopWatch } from '$lib/ts/stopwatch';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { waitUntil } from '@vercel/functions';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const analytics: Handle = async ({ event, resolve }) => {
	const sw = new StopWatch();
	sw.start();

	const response = await resolve(event);

	sw.stop();

	posthog.capture({
		event: 'request',
		distinctId: event.getClientAddress(),
		properties: {
			route_id: event.route.id,
			duration: sw.elapsed()
		}
	});

	waitUntil(posthog.shutdown());

	return response;
};

const betterAuth: Handle = async ({ event, resolve }) => {
	event.locals.auth = () => auth.api.getSession({ headers: event.request.headers });

	return svelteKitHandler({ event, resolve, auth });
};

export const handle = sequence(analytics, betterAuth);

export async function handleError({ error, status, event }) {
	if (status !== 404) {
		if (dev) {
			console.error(error);
		} else {
			const session = await event.locals.auth();
			posthog.captureException(error, session?.user.id, { url: event.url.toString() });
			await posthog.shutdown();
		}
	}
}
