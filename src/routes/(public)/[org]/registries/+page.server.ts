import { searchRegistries } from '$lib/backend/db/functions.js';

export async function load({ params, locals }) {
	const session = await locals.auth();

	const orgName = params.org;

	const registries = await searchRegistries({ org: orgName, userId: session?.user.id });

	return {
		registries: registries.data
	};
}
