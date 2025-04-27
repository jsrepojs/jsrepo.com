import { searchRegistries } from '$lib/backend/db/functions.js';
import { version } from '$lib/backend/db/schema.js';
import { desc } from 'drizzle-orm';

export async function load({ params, locals }) {
	const session = await locals.auth();

	const orgName = params.org;

	const registries = await searchRegistries({
		org: orgName,
		userId: session?.user.id,
		orderBy: desc(version.createdAt)
	});

	return {
		registries: registries.data
	};
}
