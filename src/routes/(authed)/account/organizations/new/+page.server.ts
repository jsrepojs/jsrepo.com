import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { schema } from './schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { getUser, nameIsBanned, createOrg, getUserOrOrg } from '$lib/backend/db/functions';
import assert from 'assert';
import { redirectToLogin } from '$lib/auth/redirect';
import { checkUserSubscription } from '$lib/ts/stripe/client';

export async function load({ locals, url }) {
	const form = await superValidate(valibot(schema));

	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const user = await getUser({ id: session.user.id });

	assert(user !== null, 'user must be defined');

	if (checkUserSubscription(user) === null) {
		redirect(303, `/pricing`);
	}

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

		const userPromise = getUser({ id: session.user.id });

		const userOrOrg = await getUserOrOrg(form.data.name);

		if (userOrOrg !== null) {
			return error(400, {
				message: `This name is taken!`
			});
		}

		const user = await userPromise;

		assert(user !== null, 'User must be defined');

		if (checkUserSubscription(user) === null) {
			// we will rudely redirect them since they aren't supposed to be here anyways
			redirect(303, '/pricing');
		}

		if (await nameIsBanned(form.data.name)) {
			return error(400, {
				message: `We'd appreciate if you didn't use ${form.data.name} as the name of your organization.`
			});
		}

		const org = await createOrg(session.user.id, {
			name: form.data.name,
			description: form.data.description
		});

		if (org === null) {
			return error(500, 'There was an error creating the organization.');
		}

		redirect(303, `/${form.data.name}`);
	}
};
