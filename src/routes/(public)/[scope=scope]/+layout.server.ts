import { getScopeWithOwner, hasScopeAccess } from '$lib/backend/db/functions';
import { error } from '@sveltejs/kit';

export async function load({ params, locals }) {
	const session = await locals.auth();

	if (!params.scope.startsWith('@')) {
		error(404);
	}

	const scopeName = params.scope.slice(1);

	const [scope, hasSettingsAccess] = await Promise.all([
		getScopeWithOwner(scopeName),
		hasScopeAccess(session?.user.id ?? null, scopeName)
	]);

	if (!scope) {
		error(404);
	}

	return {
		scope: scope,
		hasSettingsAccess
	};
}
