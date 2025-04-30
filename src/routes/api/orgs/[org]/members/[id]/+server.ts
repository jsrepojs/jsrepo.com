import { getOrg, removeOrgMember } from '$lib/backend/db/functions.js';
import { error, json } from '@sveltejs/kit';

export async function DELETE({ params, locals }) {
	const session = await locals.auth();

	if (!session) error(401);

	const memberId = parseInt(params.id);
	const orgName = params.org;

	const org = await getOrg({ name: orgName });

	if (!org) error(404);

	const owner = org.members.find((m) => m.userId === session.user.id && m.role === 'owner');

	if (!owner) error(401, 'only the owner can do this');

	const result = await removeOrgMember(memberId);

	if (!result) error(500, 'error removing org member');

	return json({});
}
