import { redirectToLogin } from '$lib/auth/redirect';
import { getUser } from '$lib/backend/db/functions.js';
import { redirect } from '@sveltejs/kit';
import assert from 'assert';

export async function load({ url, locals }) {
	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const user = await getUser({ id: session.user.id });

	assert(user !== null, 'User should exist!');

	if (!user.username) {
		redirect(303, '/choose-username');
	}

	return {
		session,
		user
	};
}
