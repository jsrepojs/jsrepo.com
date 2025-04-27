import { redirectToLogin } from '$lib/auth/redirect.js';
import { listPublishableScopes } from '$lib/backend/db/functions';

export async function load({ locals, url }) {
	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const scopes = await listPublishableScopes(session.user.id);

	return {
		scopes
	};
}
