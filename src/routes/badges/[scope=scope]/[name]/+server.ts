import { getVersion } from '$lib/backend/db/functions';
import { error } from '@sveltejs/kit';
import { makeBadge } from 'badge-maker';

export async function GET({ params }) {
	const scopeName = params.scope.slice(1);
	const registryName = params.name;

	const ver = await getVersion({
		scopeName,
		registryName,
		version: 'latest',
		userId: null
	});

	if (!ver) error(404);

	const badge = makeBadge({
        label: 'jsrepo',
		labelColor: '#f7df1e',
        color: '#1C1918',
		message: ver.version
	});

	return new Response(badge, {
		headers: {
			'Content-Type': 'image/svg+xml'
		}
	});
}