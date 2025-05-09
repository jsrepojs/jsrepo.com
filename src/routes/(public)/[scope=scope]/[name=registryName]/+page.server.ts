import { error } from '@sveltejs/kit';
import { getInfo } from './registry-view-server.js';

export async function load({ params, locals }) {
	const session = await locals.auth();

	const scopeName = params.scope.slice(1);
	const registryName = params.name;

	const info = await getInfo({
		scopeName,
		registryName,
		version: 'latest',
		userId: session?.user.id ?? null
	});

	if (info === null) {
		error(404);
	}

	return {
		scopeName,
		registryName,
		versionParam: 'latest',
		session,
		...info
	};
}
