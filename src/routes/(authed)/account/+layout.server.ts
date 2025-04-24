import { redirectToLogin } from '$lib/auth/redirect';
import { getUser } from '$lib/backend/db/functions.js';
import assert from 'assert';

export async function load({ url, locals }) {
	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const user = await getUser(session.user.id);

	assert(user !== null, 'User should exist!');

	return {
		session,
		user
	};
}
