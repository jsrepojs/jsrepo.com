import { POLAR_ACCESS_TOKEN } from '$env/static/private';
import { redirectToLogin } from '$lib/auth/redirect';
import { getUser } from '$lib/backend/db/functions';
import { polarEnvironment } from '$lib/ts/polar/client';
import { CustomerPortal } from '@polar-sh/sveltekit';
import assert from 'assert';

export const GET = CustomerPortal({
	accessToken: POLAR_ACCESS_TOKEN,
	server: polarEnvironment(),
	getCustomerId: async (event) => {
		const session = await event.locals.auth();

		if (!session) redirectToLogin(event.url);

		const user = await getUser(session.user.id);

		assert(user !== null, 'User should be defined!');
		assert(user.polarCustomerId !== null, 'User should have a customer id!');

		return user.polarCustomerId;
	}
});
