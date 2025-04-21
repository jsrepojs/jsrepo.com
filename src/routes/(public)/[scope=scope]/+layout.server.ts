import { getScope } from '$lib/backend/db/functions';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const scopeName = params.scope.slice(1);

	const scope = await getScope(scopeName);

	if (!scope) {
		error(404);
	}

	return {
		scope
	};
}
