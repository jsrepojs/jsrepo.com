import { getVersion } from '$lib/backend/db/functions.js';
import { json } from '@sveltejs/kit';

export async function GET({ locals, params }) {
	const scopeName = params.scope.slice(1);
	const registryName = params.name;
	const version = params.version;

	const session = await locals.auth();

	const ver = await getVersion({
		scopeName,
		registryName,
		version,
		userId: session?.user.id ?? null
	});

	return json(ver);
}
