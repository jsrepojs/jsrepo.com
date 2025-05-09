import { getVersion, hasScopeAccess } from '$lib/backend/db/functions.js';
import { error } from '@sveltejs/kit';

export async function load({ params, locals }) {
	const session = await locals.auth();

	const scopeName = params.scope.slice(1);
	const registryName = params.name;

	const [version, hasAccess] = await Promise.all([
		getVersion({
			scopeName,
			registryName,
			version: 'latest',
			userId: session?.user.id ?? null
		}),
		hasScopeAccess(session?.user.id ?? null, scopeName)
	]);

	if (version === null) error(404);

	return {
		scopeName,
		registryName,
		version,
		hasAccess
	};
}
