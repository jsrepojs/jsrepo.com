import { getVersion } from '$lib/backend/db/functions.js';
import { error } from '@sveltejs/kit';

export async function load({ params, locals }) {
	const session = await locals.auth();

	const scopeName = params.scope.slice(1);
	const registryName = params.name;

	const version = await getVersion({
		scopeName,
		registryName,
		version: 'latest',
		userId: session?.user.id ?? null
	});

	if (version === null) error(404);

	return {
		scopeName,
		registryName,
		version
	};
}
