import { auth } from '$lib/auth';
import {
	createOrgInvite,
	deleteOrgInvite,
	getOrgInvitesForEmail,
	getOrgWithMembers,
	getUser,
	getUserByEmail
} from '$lib/backend/db/functions.js';
import { orgMemberRoles, type OrgRole } from '$lib/backend/db/schema.js';
import { checkUserSubscription } from '$lib/ts/polar/client.js';
import { invitedToOrgEmail, resend } from '$lib/ts/resend.js';
import { error, json } from '@sveltejs/kit';
import assert from 'assert';

export type InviteMemberRequest = {
	email: string;
	role: OrgRole;
};

export async function POST({ params, request }) {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session) error(401);

	const orgName = params.name;

	const org = await getOrgWithMembers(orgName);

	if (!org) error(404);

	if (org.ownerId !== session.user.id) error(401, 'only the owner can invite team members');

	const body = (await request.json()) as InviteMemberRequest;

	if (!body.email) error(400, 'expected email in the request body');
	if (!body.role) error(400, 'expected role in the request body');

	const email = body.email.trim();

	if (!orgMemberRoles.includes(body.role)) return error(400, 'invalid member role');

	if (body.email === session.user.email) error(400, 'you cannot invite yourself');

	const alreadyAMember = org.members.find((m) => m.email === email) !== undefined;

	if (alreadyAMember) error(400, 'user is already a member of your org');

	const [invites, invitedUser, owner] = await Promise.all([
		getOrgInvitesForEmail(email, org.id),
		getUserByEmail(email),
		getUser(session.user.id)
	]);

	assert(owner !== null, 'user must be defined');

	if (checkUserSubscription(owner) !== 'Team') {
		error(401, 'you need a Team subscription to invite members to your organization');
	}

	if (invites.length > 0) error(400, `cannot reinvite ${email}`);

	if (!invitedUser) error(400, 'invited email is not associated with an account!');

	const invite = await createOrgInvite({ email, orgId: org.id, role: body.role });

	if (!invite) error(500, `error inviting ${email}`);

	await resend.emails.send(invitedToOrgEmail({ owner: session.user, orgName, invited: email }));

	return json({});
}

export type CancelInviteRequest = {
	requestId: number;
};

export async function DELETE({ params, request }) {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session) error(401);

	const orgName = params.name;

	const org = await getOrgWithMembers(orgName);

	if (!org) error(404);

	if (org.ownerId !== session.user.id) error(401, 'only the owner can cancel invites');

	const body = (await request.json()) as CancelInviteRequest;

	if (!body.requestId) error(400, 'expected requestId in the request body');

	const deleted = await deleteOrgInvite(body.requestId);

	if (deleted !== body.requestId) error(500, 'error cancelling invite');

	return json({});
}
