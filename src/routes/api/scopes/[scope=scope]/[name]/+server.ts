import { publicUser } from '$lib/backend/db/client-functions.js';
import { getRegistry } from '$lib/backend/db/functions.js';
import { error, json } from '@sveltejs/kit';

export async function GET({ locals, params }) {
	const scope = params.scope.slice(1);
	const registryName = params.name;

	const session = await locals.auth();

	const registry = await getRegistry({
		scopeName: scope,
		registryName,
		userId: session?.user.id ?? null
	});

	if (registry === null) error(404);

	return json({
		...registry,
		connectedStripeAccount: undefined,
		releasedBy: publicUser(registry.releasedBy)
	});
}
