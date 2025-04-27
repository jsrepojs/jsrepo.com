import { searchRegistries } from '$lib/backend/db/functions';
import { error, json } from '@sveltejs/kit';
import { asc, desc, sql, type SQL } from 'drizzle-orm';
import * as tables from '$lib/backend/db/schema.js';

const orderByOptions: Record<string, SQL> = {
	most_popular: sql`cast(sum(${tables.dailyRegistryFetch.count}) as int) desc nulls last`,
	newest: desc(tables.registry.createdAt),
	oldest: asc(tables.registry.createdAt),
	recently_published: desc(tables.version.createdAt)
};

export async function GET({ locals, url }) {
	const session = await locals.auth();

	const q = url.searchParams.get('q');
	const limit = parseInt(url.searchParams.get('limit') ?? '15');
	const offset = parseInt(url.searchParams.get('offset') ?? '0');
	const orderBy = url.searchParams.get('order_by') ?? 'most_popular';
	const lang = url.searchParams.get('lang');

	const orderBySQL = orderByOptions[orderBy];

	if (orderBySQL === undefined) {
		error(
			400,
			`invalid value for \`order_by\` valid values are ${Object.entries(orderByOptions)
				.map(([key]) => `\`${key}\``)
				.join(',')}`
		);
	}

	const registries = await searchRegistries({
		q,
		limit,
		offset,
		lang,
		userId: session?.user.id,
		orderBy: orderBySQL
	});

	return json(registries);
}
