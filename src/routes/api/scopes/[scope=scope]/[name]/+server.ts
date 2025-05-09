import { getRegistry } from '$lib/backend/db/functions.js';
import { json } from '@sveltejs/kit';

export async function GET({ locals, params }) {
	const scope = params.scope.slice(1);
	const registryName = params.name;

	const session = await locals.auth();

	const registry = await getRegistry({
		scopeName: scope,
		registryName,
		userId: session?.user.id ?? null
	});

	return json(registry);
}
