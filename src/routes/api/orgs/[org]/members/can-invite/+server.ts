import {
	getOrgInvitesForEmail,
	getOrgWithMembers,
	getUserByEmail
} from '$lib/backend/db/functions.js';
import { error, json } from '@sveltejs/kit';

export async function GET({ params, url, locals }) {
	const session = await locals.auth();

	if (!session) error(401);

	const orgName = params.org;
	const email = url.searchParams.get('email');

	if (email === null) error(400, 'expected email query param');

	const org = await getOrgWithMembers(orgName);

	if (!org) error(404);

	const alreadyAMember = org.members.find((m) => m.email === email) !== undefined;

	if (alreadyAMember) error(400, 'user is already a member of your org');

	const [invites, invitedUser] = await Promise.all([
		getOrgInvitesForEmail(email, org.id),
		getUserByEmail(email)
	]);

	if (invites.length > 0) error(400, `cannot reinvite ${email}`);

	if (!invitedUser) error(400, 'invited email is not associated with an account!');

	return json({});
}
