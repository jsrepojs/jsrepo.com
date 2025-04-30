import { getOrg, getUser } from '$lib/backend/db/functions.js';
import { error } from '@sveltejs/kit';

export async function load({ params, locals }) {
	const session = await locals.auth();

	if (!session) {
		return error(404);
	}

	const [org, user] = await Promise.all([getOrg({ name: params.org }), getUser(session?.user.id)]);

	if (!org || !user) error(404);

	const member = org.members.find((m) => m.userId === session?.user.id);

	if (!member) error(404);

	return {
		org,
		user,
		member: member ?? null
	};
}
