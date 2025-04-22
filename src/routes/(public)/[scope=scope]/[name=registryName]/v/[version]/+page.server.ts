import { auth } from '$lib/auth.js';
import { error } from '@sveltejs/kit';
import { getInfo } from '../../page.server.js';

export async function load({ params, request }) {
	const session = await auth.api.getSession({ headers: request.headers });

	const scopeName = params.scope.slice(1);
	const registryName = params.name;
	const version = params.version;

	const info = await getInfo({
		scopeName,
		registryName,
		version,
		userId: session?.user.id ?? null
	});

	if (info === null) {
		error(404);
	}

	return {
		scopeName,
		registryName,
		...info
	};
}
