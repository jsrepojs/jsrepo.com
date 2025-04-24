import { acceptOrgInvite, getOrgInvite } from '$lib/backend/db/functions.js';
import { error, json } from '@sveltejs/kit';

export type AcceptInviteRequest = {
	inviteId: number;
};

export async function PATCH({ locals, request }) {
	const session = await locals.auth();

	if (!session) error(401);

	const body = (await request.json()) as AcceptInviteRequest;

	if (!body.inviteId) error(400, 'expected inviteId in the request body');

	const invite = await getOrgInvite(body.inviteId);

	if (!invite) error(404);

	if (invite.email !== session.user.email) error(401, 'this invite is not intended for you');

	const result = await acceptOrgInvite(body.inviteId, session.user.id);

	if (!result) error(500, 'error accepting org invite');

	return json({});
}
