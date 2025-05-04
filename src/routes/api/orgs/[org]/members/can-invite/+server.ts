import { getOrgInvitesForUserId, getOrg, getUser } from '$lib/backend/db/functions.js';
import { error, json } from '@sveltejs/kit';

export async function GET({ params, url, locals }) {
	const session = await locals.auth();

	if (!session) error(401);

	const orgName = params.org;
	const username = url.searchParams.get('username');

	if (username === null) error(400, 'expected username query param');

	const [org, user] = await Promise.all([getOrg({ name: orgName }), getUser({ username })]);

	if (!org) error(404);

	if (!user) error(400, 'invited user does not exist');

	const alreadyAMember = org.members.find((m) => m.user.username === username) !== undefined;

	if (alreadyAMember) error(400, 'user is already a member of your org');

	const invites = await getOrgInvitesForUserId(user.id, org.id);

	if (invites.length > 0) error(400, `cannot reinvite ${username}`);

	return json({});
}
