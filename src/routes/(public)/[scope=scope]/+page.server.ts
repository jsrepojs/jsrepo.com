import { getScopeRegistries } from '$lib/backend/db/functions.js';

export async function load({ params, locals }) {
	const session = await locals.auth();

	const scopeName = params.scope.slice(1);

	const registries = await getScopeRegistries(session?.user.id ?? null, scopeName);

	return {
		registries
	};
}
