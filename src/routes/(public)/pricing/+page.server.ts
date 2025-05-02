import { getUser, type UserWithSubscription } from '$lib/backend/db/functions.js';
import { immediate } from '$lib/ts/promises.js';

export async function load({ locals }) {
	const session = await locals.auth();

	let userPromise: Promise<UserWithSubscription | null>;

	if (session) {
		userPromise = getUser(session.user.id);
	} else {
		userPromise = immediate(null);
	}

	return {
		userPromise,
		session
	};
}
