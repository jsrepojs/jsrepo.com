import { auth } from '$lib/auth.js';
import { message, superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { schema } from './schema';
import { fail } from '@sveltejs/kit';
import { getApiKey } from '$lib/backend/db/functions';

export async function load({ url }) {
	const name = url.searchParams.get('name');

	const form = await superValidate({ name: name ?? undefined }, valibot(schema));

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

		const apiKey = await getApiKey(form.data.name);

		if (apiKey !== null) {
			return fail(400, { form, message: `api key with name ${form.data.name} already exists!` });
		}

		const result = await auth.api.createApiKey({
			body: {
				name: form.data.name,
				permissions: {
					packages: ['publish']
				},
				userId: session.user.id
			},
			headers: request.headers
		});

		return message(form, result);
	}
};
