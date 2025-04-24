import { redirectToLogin } from '$lib/auth/redirect';
import { getOrgInvitesForEmail } from '$lib/backend/db/functions.js';

export async function load({ locals, url }) {
	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const orgInvitesInbox = await getOrgInvitesForEmail(session.user.email);

	return {
		orgInvitesInbox
	};
}
