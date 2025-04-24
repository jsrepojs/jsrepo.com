import { getOrgInvite, rejectOrgInvite } from '$lib/backend/db/functions.js';
import { error, json } from '@sveltejs/kit';

export type RejectInviteRequest = {
	inviteId: number;
};

export async function PATCH({ locals, request }) {
	const session = await locals.auth();

	if (!session) error(401);

	const body = (await request.json()) as RejectInviteRequest;

	if (!body.inviteId) error(400, 'expected inviteId in the request body');

	const invite = await getOrgInvite(body.inviteId);

	if (!invite) error(404);

	if (invite.email !== session.user.email) error(401, 'this invite is not intended for you');

	const result = await rejectOrgInvite(body.inviteId);

	if (!result) error(500, 'error rejecting org invite');

	return json({});
}
