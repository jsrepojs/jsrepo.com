import { dev } from '$app/environment';
import { auth } from '$lib/auth';
import { posthog } from '$lib/ts/posthog';
import { StopWatch } from '$lib/ts/stopwatch';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { waitUntil } from '@vercel/functions';
import { svelteKitHandler } from 'better-auth/svelte-kit';

/**
 * Page routes always live inside a route group (`(public)` / `(authed)`) so their route ids
 * start with `/(`. Endpoints (`/api`, `/badges`) don't, and requests that never matched a route
 * (better-auth, remote functions, 404s) have no route id at all.
 */
function isPageRoute(routeId: string | null): boolean {
	return routeId?.startsWith('/(') === true;
}

/** Content types a form action can actually read a body from. */
const FORM_CONTENT_TYPES = [
	'application/x-www-form-urlencoded',
	'multipart/form-data',
	// used by the no-JS fallback of remote `form()` submissions
	'application/x-sveltekit-formdata'
];

/**
 * Every real form submission — progressively enhanced or not — sends the body as `FormData`,
 * so anything else POSTing at a page is a bot, a scanner, or a client that meant to hit `/api`.
 */
function isFormSubmission(request: Request): boolean {
	// set by `use:enhance`
	if (request.headers.get('x-sveltekit-action') === 'true') return true;

	const contentType = request.headers.get('content-type') ?? '';

	return FORM_CONTENT_TYPES.some((type) => contentType.startsWith(type));
}

/**
 * Reject unexpected POSTs at page routes before they reach the router, where SvelteKit would
 * otherwise throw "POST method not allowed. No form actions exist for this page" and report it
 * as an application error.
 */
const methodGuard: Handle = async ({ event, resolve }) => {
	if (
		event.request.method === 'POST' &&
		isPageRoute(event.route.id) &&
		!isFormSubmission(event.request)
	) {
		return new Response('Method Not Allowed', {
			status: 405,
			// https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
			headers: { allow: 'GET' }
		});
	}

	return resolve(event);
};

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

export const handle = sequence(methodGuard, analytics, betterAuth);

export async function handleError({ error, status, event }) {
	if (dev) {
		if (status !== 404) console.error(error);
		return;
	}

	// 4xx responses are expected client errors (missing pages, bad methods, failed auth, rate
	// limits) rather than bugs — reporting them buries real failures in noise.
	if (status < 500) return;

	const session = await event.locals.auth();
	posthog.captureException(error, session?.user.id, { url: event.url.toString() });
	await posthog.shutdown();
}
