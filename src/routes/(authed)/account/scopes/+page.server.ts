import { redirectToLogin } from '$lib/auth/redirect';
import { getUser, listMyScopes } from '$lib/backend/db/functions.js';
import assert from 'assert';

export async function load({ locals, url }) {
	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const [user, scopes] = await Promise.all([
		getUser({ id: session.user.id }),
		listMyScopes(session.user.id)
	]);

	assert(user !== null, 'User should exist!');

	return {
		scopes,
		user
	};
}
