import { searchRegistries } from '$lib/backend/db/functions.js';

export async function load({ params, locals }) {
	const session = await locals.auth();

	const scopeName = params.scope.slice(1);

	const registries = await searchRegistries({ scope: scopeName, userId: session?.user.id });

	return {
		registries
	};
}
