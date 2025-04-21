import { auth } from '$lib/auth.js';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { schema } from './schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { createScope, getScope, getUser, listMyScopes } from '$lib/backend/db/functions';
import assert from 'assert';
import { checkUserSubscription } from '$lib/ts/polar/client';

export async function load() {
	const form = await superValidate(valibot(schema));

	return {
		form
	};
}

export const actions = {
	default: async ({ request }) => {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (session === null) return fail(401);

		const form = await superValidate(request, valibot(schema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const promises = Promise.all([getUser(session.user.id), listMyScopes(session.user.id)]);

		const scope = await getScope(form.data.name);

		if (scope !== null) {
			return error(400, {
				message: `This scope has already been claimed!`
			});
		}

		const [user, scopes] = await promises;

		assert(user !== null, 'User must be defined');

		if (scopes.userScopes.length >= user.scopeLimit) {
			if (!checkUserSubscription(user)) {
				return error(400, { message: 'You are at your scope limit!' });
			}
		}

		const id = await createScope({ name: form.data.name, userId: session.user.id });

		if (id === null) {
			return error(500, 'There was an error creating the scope.');
		}

		redirect(303, `/@${form.data.name}`);
	}
};
