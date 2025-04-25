import { searchRegistries } from '$lib/backend/db/functions';
import { json } from '@sveltejs/kit';

export async function GET({ locals, url }) {
	const session = await locals.auth();

	const q = url.searchParams.get('q');
	const limit = parseInt(url.searchParams.get('limit') ?? '15');
	const offset = parseInt(url.searchParams.get('offset') ?? '0');

	const registries = await searchRegistries({ q, limit, offset, userId: session?.user.id });

    return json(registries)
}
