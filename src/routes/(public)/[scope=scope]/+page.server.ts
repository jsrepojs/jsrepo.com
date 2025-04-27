import { searchRegistries } from '$lib/backend/db/functions.js';
import { version } from '$lib/backend/db/schema';
import { desc } from 'drizzle-orm';

export async function load({ params, locals }) {
	const session = await locals.auth();

	const scopeName = params.scope.slice(1);

	const registries = await searchRegistries({
		scope: scopeName,
		userId: session?.user.id,
		orderBy: desc(version.createdAt)
	});

	return {
		registries: registries.data
	};
}
