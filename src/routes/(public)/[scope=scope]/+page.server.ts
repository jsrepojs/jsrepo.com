import { auth } from '$lib/auth.js';
import { getScopeRegistries } from '$lib/backend/db/functions.js';

export async function load({ params, request }) {
	const session = await auth.api.getSession({ headers: request.headers });

	const scopeName = params.scope.slice(1);

	const registries = await getScopeRegistries(session?.user.id ?? null, scopeName);

	return {
		registries
	};
}
