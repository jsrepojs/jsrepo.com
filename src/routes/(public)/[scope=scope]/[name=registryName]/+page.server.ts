import { error } from '@sveltejs/kit';
import { getInfo, actions } from './registry-view-server.js';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { reviewSchema } from '$lib/components/site/registry-view/types.js';

export async function load({ params, locals }) {
	// const session = await locals.auth();

	const scopeName = params.scope.slice(1);
	const registryName = params.name;

	return {

	}
}

export { actions };
