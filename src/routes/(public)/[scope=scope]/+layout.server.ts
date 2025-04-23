import { auth } from '$lib/auth.js';
import { getScopeWithOwner, hasScopeAccess } from '$lib/backend/db/functions';
import { error } from '@sveltejs/kit';

export async function load({ params, request }) {
	const session = await auth.api.getSession({ headers: request.headers });

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
		scope: scope.scope,
		owner: scope.user,
		ownerOrg: scope.org,
		hasSettingsAccess
	};
}
