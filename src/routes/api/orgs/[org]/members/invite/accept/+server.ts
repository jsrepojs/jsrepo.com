import { acceptOrgInvite, getOrg, getOrgInvite } from '$lib/backend/db/functions.js';
import { error, json } from '@sveltejs/kit';

export type AcceptInviteRequest = {
	inviteId: number;
};

export async function PATCH({ locals, request, params }) {
	const session = await locals.auth();

	if (!session) error(401);

	const body = (await request.json()) as AcceptInviteRequest;

	if (!body.inviteId) error(400, 'expected inviteId in the request body');

	const [invite, org] = await Promise.all([
		getOrgInvite(body.inviteId),
		getOrg({ name: params.org })
	]);

	if (!invite || !org) error(404);

	if (invite.userId !== session.user.id) error(401, 'this invite is not intended for you');

	// org is already full
	if ((org.subscription?.seats ?? 0) + 1 < org.members.length + 1) {
		error(400, "this org doesn't have any seats left");
	}

	const result = await acceptOrgInvite(body.inviteId, session.user.id);

	if (!result) error(500, 'error accepting org invite');

	return json({});
}
