import { auth } from '$lib/auth';
import { message, superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { schema } from './schema';
import { error, fail } from '@sveltejs/kit';
import { getApiKey } from '$lib/backend/db/functions';
import { accessTokenCreatedEmail, resend } from '$lib/ts/resend';
import type { APIKey } from '$lib/backend/db/schema';

export async function load() {
	const form = await superValidate(valibot(schema));

	return {
		form
	};
}

export const actions = {
	default: async ({ request, locals }) => {
		const session = await locals.auth();

		if (session === null) return fail(401);

		const form = await superValidate(request, valibot(schema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const expiresIn = form.data.expiresIn === 0 ? null : form.data.expiresIn;

		const apiKey = await getApiKey(session.user.id, form.data.name);

		if (apiKey !== null) {
			return error(400, {
				message: `An access token with the name ${form.data.name} already exists!`
			});
		}

		const result = await auth.api.createApiKey({
			body: {
				name: form.data.name,
				permissions: {
					registries: ['publish']
				},
				userId: session.user.id,
				expiresIn
			},
			headers: request.headers
		});

		await resend.emails.send(accessTokenCreatedEmail(session.user, result as APIKey));

		return message(form, result);
	}
};
