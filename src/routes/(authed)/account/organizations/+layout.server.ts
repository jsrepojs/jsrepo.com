import { redirectToLogin } from '$lib/auth/redirect';
import { getOrgInvitesForUserId } from '$lib/backend/db/functions.js';

export async function load({ locals, url }) {
	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const orgInvitesInbox = await getOrgInvitesForUserId(session.user.id);

	return {
		orgInvitesInbox
	};
}
