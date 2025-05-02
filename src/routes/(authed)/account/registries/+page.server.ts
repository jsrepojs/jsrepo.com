import { redirectToLogin } from '$lib/auth/redirect.js';
import { searchRegistries } from '$lib/backend/db/functions';
import { desc } from 'drizzle-orm';
import * as tables from '$lib/backend/db/schema.js';

export async function load({ locals, url }) {
	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const registries = await searchRegistries({
		userId: session.user.id,
		readonlyAccess: false,
		orderBy: desc(tables.version.createdAt)
	});

	return {
		registries
	};
}
