import { error } from '@sveltejs/kit';
import { getInfo, actions } from './registry-view-server.js';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { reviewSchema } from '$lib/components/site/registry-view/types.js';

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

	if (info === null) error(404);

	const reviewForm = await superValidate(valibot(reviewSchema));

	return {
		reviewForm,
		scopeName,
		registryName,
		versionParam: 'latest',
		session,
		...info
	};
}

export { actions };
