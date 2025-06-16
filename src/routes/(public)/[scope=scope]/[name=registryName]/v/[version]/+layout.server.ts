import { getVersion } from '$lib/backend/db/functions.js';
import { error } from '@sveltejs/kit';
import * as promise from '$lib/ts/promises';

export async function load({ params, locals }) {
	const session = await locals.auth();

	const scopeName = params.scope.slice(1);
	const registryName = params.name;

	const version = await promise.timed(
		getVersion({
			scopeName,
			registryName,
			version: params.version,
			userId: session?.user.id ?? null
		}),
		'getVersion - version'
	);

	if (version === null) error(404);

	return {
		scopeName,
		registryName,
		version
	};
}
