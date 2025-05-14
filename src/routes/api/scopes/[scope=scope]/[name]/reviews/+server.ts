import { getReviews } from '$lib/backend/db/functions.js';
import { error, json } from '@sveltejs/kit';

export async function GET({ locals, params, url }) {
	const session = await locals.auth();

	if (!session) error(401);

	const scope = params.scope.slice(1);
	const registry = params.name;

	const limit = parseInt(url.searchParams.get('limit') ?? '10');
	const offset = parseInt(url.searchParams.get('offset') ?? '0');

	return json(await getReviews({ scope, registry, offset, limit }));
}
