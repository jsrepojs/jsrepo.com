import { getUser, type UserWithSubscription } from '$lib/backend/db/functions.js';
import { immediate } from '$lib/ts/promises.js';

export async function load({ locals }) {
	const session = await locals.auth();

	let userPromise: Promise<UserWithSubscription | null>;

	if (session !== null) {
		userPromise = getUser({id: session.user.id});
	} else {
		userPromise = immediate(null);
	}

	return {
		userPromise,
		session
	};
}
