import { getPendingOrgInvites } from '$lib/backend/db/functions.js';

export async function load({ params, locals }) {
	const session = await locals.auth();

	const orgName = params.org;

	const invitations = await getPendingOrgInvites(orgName, session?.user.id ?? null);

	return {
		invitations
	};
}
