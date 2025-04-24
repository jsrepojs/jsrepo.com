import { auth } from '$lib/auth';
import { createOrgInvite, getOrgInvites, getOrgWithMembers } from '$lib/backend/db/functions.js';
import { orgMemberRoles, type OrgRole } from '$lib/backend/db/schema.js';
import { invitedToOrgEmail, resend } from '$lib/ts/resend.js';
import { error, json } from '@sveltejs/kit';

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

	const invites = await getOrgInvites(email, org.id);

	if (invites.length > 0) error(400, `cannot reinvite ${email}`);

	const invite = await createOrgInvite({ email, orgId: org.id, role: body.role });

	if (!invite) error(500, `error inviting ${email}`);

	await resend.emails.send(invitedToOrgEmail({ owner: session.user, orgName, invited: email }));

	return json({});
}
