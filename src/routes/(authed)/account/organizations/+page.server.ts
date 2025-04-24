import { redirectToLogin } from '$lib/auth/redirect';
import { listMyOrganizations } from '$lib/backend/db/functions.js';

export async function load({ locals, url }) {
	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const organizations = await listMyOrganizations(session.user.id);

	return {
		organizations
	};
}
