import { getUser, getUserMemberOrgs, searchRegistries } from '$lib/backend/db/functions.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const user = await getUser({ username: params.username });

	if (user === null) error(404);

	const [registries, orgs] = await Promise.all([
		searchRegistries({ ownedById: user.id }),
		getUserMemberOrgs(user.id)
	]);

	return {
		user,
		registries,
		orgs
	};
}
