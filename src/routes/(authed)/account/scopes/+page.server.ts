import { auth } from '$lib/auth';
import { redirectToLogin } from '$lib/auth/redirect';
import { listMyScopes } from '$lib/backend/db/functions.js';

export async function load({ request, url }) {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session) redirectToLogin(url);

	const scopes = await listMyScopes(session.user.id);

	return {
		scopes
	};
}
