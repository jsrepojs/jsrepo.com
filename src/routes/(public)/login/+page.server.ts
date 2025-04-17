import { auth } from '$lib/auth';
import { redirectToAuthorized } from '$lib/auth/redirect.js';

export async function load({ request, url }) {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (session !== null) redirectToAuthorized(url);

	return {};
}
