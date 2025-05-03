import { getUserOrOrg } from '$lib/backend/db/functions.js';
import { error, json } from '@sveltejs/kit';

export async function GET({ url }) {
	const search = url.searchParams.get('search');

	if (search === null || search.trim() === '') {
		error(400, 'invalid search!');
	}

	const result = await getUserOrOrg(search);

	if (result === null) {
		error(404);
	}

	return json({});
}
