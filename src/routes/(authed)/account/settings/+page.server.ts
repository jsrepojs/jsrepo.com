import { redirectToLogin } from '$lib/auth/redirect';
import { listMyScopes } from '$lib/backend/db/functions.js';

export async function load({ locals, url }) {
	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const scopes = listMyScopes(session.user.id);

	return {
		scopes
	};
}
