import { redirectToAuthorized } from '$lib/auth/redirect.js';

export async function load({ locals, url }) {
	const session = await locals.auth();

	if (session !== null) redirectToAuthorized(url);

	return {};
}
