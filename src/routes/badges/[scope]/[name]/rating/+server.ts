import { getRegistry } from '$lib/backend/db/functions';
import { errorBadge } from '$lib/ts/badges';
import { makeBadge } from 'badge-maker';

export async function GET({ params }) {
	const scopeName = params.scope.slice(1);
	const registryName = params.name;

	const registry = await getRegistry({
		scopeName,
		registryName,
		userId: null
	});

	if (!registry) {
		return errorBadge('jsrepo', 404);
	}

	const badge = makeBadge({
		label: 'jsrepo',
		labelColor: '#f7df1e',
		color: '#1C1918',
		message: `${registry.rating?.toFixed(1) ?? `0.0`}`
	});

	return new Response(badge, {
		headers: {
			'Content-Type': 'image/svg+xml'
		}
	});
}
