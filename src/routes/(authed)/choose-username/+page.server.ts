import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { schema } from './schema';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	getUser,
	nameIsBanned,
	getUserOrOrg,
	updateUsername
} from '$lib/backend/db/functions';
import assert from 'assert';
import { redirectToLogin } from '$lib/auth/redirect';

export async function load({ locals, url }) {
	const form = await superValidate(valibot(schema));

	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const user = await getUser(session.user.id);

	assert(user !== null, 'user must exist');

	if (user.username !== null) {
		redirect(303, '/account');
	}

	return {
		user,
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

		const exists = await getUserOrOrg(form.data.username);

		if (exists) {
			return error(400, {
				message: `This username is taken!`
			});
		}

		const user = await userPromise;

		assert(user !== null, 'User must be defined');

		if (user.username !== null) {
			return error(400, {
				message: 'This is only for the first time you pick a username'
			});
		}

		if (await nameIsBanned(form.data.username)) {
			return error(400, {
				message: `We'd appreciate if you didn't use ${form.data.username} as your username.`
			});
		}

		const result = await updateUsername(session.user.id, form.data.username);

		if (!result) {
			return error(500, 'There was an error updating your username.');
		}

		redirect(303, `/account`);
	}
};
