import {
	createOrgInvite,
	deleteOrgInvite,
	getOrgInvitesForEmail,
	getOrg,
	getUserByEmail
} from '$lib/backend/db/functions.js';
import { orgMemberRoles, type OrgRole } from '$lib/backend/db/schema.js';
import { invitedToOrgEmail, resend } from '$lib/ts/resend.js';
import { error, json } from '@sveltejs/kit';

export type InviteMemberRequest = {
	email: string;
	role: OrgRole;
};

export async function POST({ params, request, locals }) {
	const session = await locals.auth();

	if (!session) error(401);

	const orgName = params.org;

	const org = await getOrg({ name: orgName });

	if (!org) error(404);

	const memberCount = org.members.length;

	const member = org.members.find((m) => m.userId === session.user.id);

	if (member?.role !== 'owner') error(401, 'only the owner can invite team members');

	const body = (await request.json()) as InviteMemberRequest;

	if (!body.email) error(400, 'expected email in the request body');
	if (!body.role) error(400, 'expected role in the request body');

	const email = body.email.trim();

	if (!orgMemberRoles.includes(body.role)) error(400, 'invalid member role');

	if (body.email === session.user.email) error(400, 'you cannot invite yourself');

	const alreadyAMember = org.members.find((m) => m.user.email === email) !== undefined;

	if (alreadyAMember) error(400, 'user is already a member of your org');

	const [invites, invitedUser] = await Promise.all([
		getOrgInvitesForEmail(email, org.id),
		getUserByEmail(email)
	]);

	if (org.subscription === null) {
		error(401, 'you need to buy seats before inviting members to your organization');
	}

	if (!org.subscription.seats || memberCount + 1 > org.subscription.seats) {
		error(400, 'you need to purchase more seats');
	}

	if (invites.length > 0) error(400, `cannot reinvite ${email}`);

	if (!invitedUser) error(400, 'invited email is not associated with an account!');

	const invite = await createOrgInvite({ email, orgId: org.id, role: body.role });

	if (!invite) error(500, `error inviting ${email}`);

	await resend.emails.send(invitedToOrgEmail({ owner: session.user, orgName, invited: email }));

	return json({});
}

export type CancelInviteRequest = {
	inviteId: number;
};

export async function DELETE({ params, request, locals }) {
	const session = await locals.auth();

	if (!session) error(401);

	const orgName = params.org;

	const org = await getOrg({ name: orgName });

	if (!org) error(404);

	const member = org.members.find((m) => m.userId === session.user.id);

	if (member?.role !== 'owner') error(401, 'only the owner can cancel invites');

	const body = (await request.json()) as CancelInviteRequest;

	if (!body.inviteId) error(400, 'expected requestId in the request body');

	const deleted = await deleteOrgInvite(body.inviteId);

	if (deleted !== body.inviteId) error(500, 'error cancelling invite');

	return json({});
}
