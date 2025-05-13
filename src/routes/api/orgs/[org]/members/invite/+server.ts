import {
	createOrgInvite,
	deleteOrgInvite,
	getOrgInvitesForUserId,
	getOrg,
	getUser
} from '$lib/backend/db/functions.js';
import { orgMemberRoles } from '$lib/backend/db/schema.js';
import { validateRequest } from '$lib/ts/http/request.js';
import { invitedToOrgEmail, resend } from '$lib/ts/resend.js';
import { error, json } from '@sveltejs/kit';
import * as v from 'valibot';

const inviteMemberRequestSchema = v.object({
	username: v.string(),
	role: v.union([v.literal('member'), v.literal('publisher'), v.literal('owner')])
});

export type InviteMemberRequest = v.InferOutput<typeof inviteMemberRequestSchema>;

export async function POST({ params, request, locals }) {
	const body = await validateRequest(inviteMemberRequestSchema, request);

	const session = await locals.auth();

	if (!session) error(401);

	const orgName = params.org;

	const [org, invitedUser] = await Promise.all([
		getOrg({ name: orgName }),
		getUser({ username: body.username })
	]);

	if (!org) error(404);

	if (!invitedUser) error(400, 'user does not exist with this username');

	const self = org.members.find((m) => m.userId === session.user.id);

	if (self?.role !== 'owner') error(401, 'your must be an owner to invite team members');

	if (!orgMemberRoles.includes(body.role)) error(400, 'invalid member role');

	if (body.username === self.user.username) error(400, 'you cannot invite yourself');

	const alreadyAMember = org.members.find((m) => m.user.username === body.username) !== undefined;

	if (alreadyAMember) error(400, 'user is already a member of your org');

	const invites = await getOrgInvitesForUserId(invitedUser.id, org.id);

	if (invites.length > 0) error(400, `cannot reinvite ${body.username}`);

	const invite = await createOrgInvite({ userId: invitedUser.id, orgId: org.id, role: body.role });

	if (!invite) error(500, `error inviting ${body.username}`);

	await resend.emails.send(
		invitedToOrgEmail({ owner: self.user, orgName, invited: invitedUser.email })
	);

	return json({});
}

const cancelInviteRequestSchema = v.object({
	inviteId: v.number()
});

export type CancelInviteRequest = v.InferOutput<typeof cancelInviteRequestSchema>;

export async function DELETE({ params, request, locals }) {
	const body = await validateRequest(cancelInviteRequestSchema, request);

	const session = await locals.auth();

	if (!session) error(401);

	const orgName = params.org;

	const org = await getOrg({ name: orgName });

	if (!org) error(404);

	const self = org.members.find((m) => m.userId === session.user.id);

	if (self?.role !== 'owner') error(401, 'only the owner can cancel invites');

	const deleted = await deleteOrgInvite(body.inviteId);

	if (deleted !== body.inviteId) error(500, 'error cancelling invite');

	return json({});
}
