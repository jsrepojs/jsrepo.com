import { redirectToLogin } from '$lib/auth/redirect';
import { listApiKeys } from '$lib/backend/db/functions.js';

export async function load({ locals, url }) {
	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const apiKeys = await listApiKeys(session.user.id);

	return {
		apiKeys
	};
}
