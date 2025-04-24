import { error } from '@sveltejs/kit';
import type { InviteMemberRequest } from '../+server';

export type AcceptInviteRequest = {
	inviteId: number;
};

export async function PATCH({ params, locals, request }) {
	const session = await locals.auth();

	const orgName = params.org;

	const body = (await request.json()) as InviteMemberRequest;

	if (!body.email) error(400, 'expected email in the request body');
}
