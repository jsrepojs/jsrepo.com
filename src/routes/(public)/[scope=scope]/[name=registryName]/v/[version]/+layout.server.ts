import { getVersion } from '$lib/backend/db/functions.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const scopeName = params.scope.slice(1);
	const registryName = params.name;

	const version = await getVersion(scopeName, registryName, params.version);

	if (version === null) error(404);

	return {
		scopeName,
		registryName,
		version
	};
}
