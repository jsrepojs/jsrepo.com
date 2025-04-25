import type { RegistryDetails } from '$lib/backend/db/functions.js';
import { error } from '@sveltejs/kit';

const LIMIT = 15;

export async function load({ url, fetch }) {
	// pagination
	const page = parseInt(url.searchParams.get('page') ?? '1');

	url.searchParams.set('offset', ((page - 1) * LIMIT).toString());
	url.searchParams.set('limit', LIMIT.toString());

	const response = await fetch(`/api/registries?${url.searchParams.toString()}`);

	if (!response.ok) {
		error(response.status);
	}

	const registries = (await response.json()) as { total: number; data: RegistryDetails[] };

	return {
		total: registries.total,
		registries: registries.data,
		query: url.searchParams.get('q') ?? '',
		LIMIT
	};
}
