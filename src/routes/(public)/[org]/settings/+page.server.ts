import { getOrgWithMembers } from '$lib/backend/db/functions.js';
import { error } from '@sveltejs/kit';

export async function load({ params, locals }) {
	const session = await locals.auth();

	const org = await getOrgWithMembers(params.org);

	if (!org) error(404);

	const member = org.members.find((u) => u.id === session?.user.id);

	if (!member) error(404);

	return {
		org,
		member: member ?? null
	};
}
