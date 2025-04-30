import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { schema } from './schema';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	createScope,
	getScope,
	getUser,
	nameIsBanned,
	listMyScopes,
	listMyOrganizations,
	getOrg,
	type FullOrg
} from '$lib/backend/db/functions';
import assert from 'assert';
import { checkUserSubscription } from '$lib/ts/stripe/client';
import { redirectToLogin } from '$lib/auth/redirect';
import { immediate } from '$lib/ts/promises';

export async function load({ locals, url }) {
	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const orgs = await listMyOrganizations(session.user.id);

	const form = await superValidate(valibot(schema));

	return {
		orgs,
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

		let orgPromise: Promise<FullOrg | null>;

		if (form.data.org === '') {
			orgPromise = immediate(null);
		} else {
			orgPromise = getOrg({ name: form.data.org });
		}

		const promises = Promise.all([getUser(session.user.id), listMyScopes(session.user.id)]);

		const scope = await getScope(form.data.name);

		if (scope !== null) {
			return error(400, {
				message: `This scope has already been claimed!`
			});
		}

		const [user, scopes] = await promises;
		const org = await orgPromise;

		if (org === null && form.data.org !== '') {
			return error(400, {
				message: 'This organization does not exist'
			});
		}

		if (org !== null) {
			if (!org.members.find((m) => m.userId === session.user.id)) {
				return error(401, {
					message: 'You can only claim scopes for organizations you are a member of.'
				});
			}
		}

		assert(user !== null, 'User must be defined');

		if (scopes.userScopes.length >= user.scopeLimit) {
			if (!checkUserSubscription(user)) {
				return error(400, { message: 'You are at your scope limit!' });
			}
		}

		if (await nameIsBanned(form.data.name)) {
			return error(400, {
				message: `We'd appreciate if you didn't use ${form.data.name} as the name of your scope.`
			});
		}

		const id = await createScope({
			name: form.data.name,
			userId: org === null ? session.user.id : undefined,
			orgId: org === null ? undefined : org.id
		});

		if (id === null) {
			return error(500, 'There was an error creating the scope.');
		}

		redirect(303, `/@${form.data.name}`);
	}
};
