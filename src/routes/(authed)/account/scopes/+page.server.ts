import { auth } from '$lib/auth';
import { redirectToLogin } from '$lib/auth/redirect';
import { getUser, listMyScopes } from '$lib/backend/db/functions.js';
import { resend, welcomeEmail } from '$lib/ts/resend.js';
import assert from 'assert';

export async function load({ request, url }) {
	const session = await auth.api.getSession({ headers: request.headers });
	const testEmail = (await url.searchParams.get('email')) !== null;

	if (!session) redirectToLogin(url);

	const [user, scopes] = await Promise.all([
		getUser(session.user.id),
		listMyScopes(session.user.id)
	]);

	assert(user !== null, 'User should exist!');

	if (testEmail) {
		console.log('testing email')

		await resend.emails.send(welcomeEmail(user));
	}

	return {
		scopes,
		user
	};
}
