import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { schema } from './schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { getUser, nameIsBanned, getOrg, createOrg } from '$lib/backend/db/functions';
import assert from 'assert';
import { checkUserSubscription } from '$lib/ts/polar/client';
import { redirectToLogin } from '$lib/auth/redirect';

export async function load({ locals, url }) {
	const form = await superValidate(valibot(schema));

	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const user = await getUser(session.user.id);

	assert(user !== null, 'user must be defined');

	if (checkUserSubscription(user) !== 'Team') {
		redirect(303, `/checkout/team`);
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

		const userPromise = getUser(session.user.id);

		const ogOrg = await getOrg(form.data.name);

		if (ogOrg !== null) {
			return error(400, {
				message: `An organization with this name already exists!`
			});
		}

		const user = await userPromise;

		assert(user !== null, 'User must be defined');

		if (checkUserSubscription(user) !== 'Team') {
			// we will rudely redirect them since they aren't supposed to be here anyways
			redirect(303, '/checkout/team');
		}

		if (await nameIsBanned(form.data.name)) {
			return error(400, {
				message: `We'd appreciate if you didn't use ${form.data.name} as the name of your organization.`
			});
		}

		const org = await createOrg({
			name: form.data.name,
			description: form.data.description,
			ownerId: session.user.id
		});

		if (org === null) {
			return error(500, 'There was an error creating the organization.');
		}

		redirect(303, `/${form.data.name}`);
	}
};
