import { auth } from '$lib/auth';
import { getPendingOrgInvites } from '$lib/backend/db/functions.js';

export async function load({ params, request }) {
	const session = await auth.api.getSession({ headers: request.headers });

	const orgName = params.org;

	const invitations = await getPendingOrgInvites(orgName, session?.user.id ?? null);

	return {
		invitations
	};
}
