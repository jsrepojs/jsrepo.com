import { searchRegistries } from '$lib/backend/db/functions';
import { error, json } from '@sveltejs/kit';
import { asc, desc, eq, not, sql, type SQL } from 'drizzle-orm';
import * as tables from '$lib/backend/db/schema.js';

const orderByOptions: Record<string, SQL | null> = {
	default: null,
	most_popular: sql`cast(sum(${tables.dailyRegistryFetch.count}) as int) desc nulls last`,
	newest: desc(tables.registry.createdAt),
	oldest: asc(tables.registry.createdAt),
	recently_published: desc(tables.version.createdAt)
};

const typeOptions: Record<string, SQL | null> = {
	all: null,
	free: not(eq(tables.registry.access, 'marketplace')),
	paid: eq(tables.registry.access, 'marketplace')
};

export async function GET({ locals, url }) {
	const session = await locals.auth();

	const query = url.searchParams.get('q');
	const limit = parseInt(url.searchParams.get('limit') ?? '15');
	const offset = parseInt(url.searchParams.get('offset') ?? '0');
	const orderBy = url.searchParams.get('order_by') ?? 'default';
	const lang = url.searchParams.get('lang');
	const type = url.searchParams.get('type') ?? 'all';

	const { q, keywords } = parseKeywords(query ?? '');

	console.log('query', `'${q}'`);

	console.log(keywords);

	const orderBySQL = orderByOptions[orderBy];

	if (orderBySQL === undefined) {
		error(
			400,
			`invalid value for \`order_by\` valid values are ${Object.entries(orderByOptions)
				.map(([key]) => `\`${key}\``)
				.join(',')}`
		);
	}

	const typeSQL = typeOptions[type];

	if (typeSQL === undefined) {
		error(
			400,
			`invalid value for \`type\` valid values are ${Object.entries(typeOptions)
				.map(([key]) => `\`${key}\``)
				.join(',')}`
		);
	}

	const registries = await searchRegistries({
		q,
		keywords,
		limit,
		offset,
		lang,
		userId: session?.user.id,
		orderBy: orderBySQL,
		type: typeSQL
	});

	return json(registries);
}

function parseKeywords(q: string): { q: string; keywords: string[] } {
	const index = q?.indexOf('keywords:');

	if (index === -1) return { q, keywords: [] };

	let endIndex = q?.indexOf(' ', index);

	if (endIndex === -1) {
		endIndex = q.length;
	}

	const keywords = q
		.slice(index, endIndex)
		.slice('keywords:'.length)
		.split(',')
		.filter((v) => v.trim().length !== 0);

	return { q: `${q.slice(0, index)}${q.slice(endIndex)}`.trim(), keywords };
}
