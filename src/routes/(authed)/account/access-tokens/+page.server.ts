import { auth } from '$lib/auth';
import { redirectToLogin } from '$lib/auth/redirect';
import { listApiKeys } from '$lib/backend/db/functions.js';

export async function load({ request, url }) {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session) redirectToLogin(url);

	const apiKeys = await listApiKeys(session.user.id);

	return {
		apiKeys
	};
}
