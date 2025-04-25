// handles redirecting the user to get authorized before going to checkout

import { redirectToLogin } from '$lib/auth/redirect.js';
import { createCustomer, getUser } from '$lib/backend/db/functions.js';
import { checkUserSubscription, getProductId } from '$lib/ts/polar/client.js';
import { polar } from '$lib/ts/polar/index.js';
import { error, redirect } from '@sveltejs/kit';
import assert from 'assert';

export async function GET({ url, locals, params }) {
	const productId = getProductId(params.product);

	if (!productId) error(404);

	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	let user = await getUser(session.user.id);

	assert(user !== null, 'User should be defined!');

	if (user.polarCustomerId === null) {
		const userResult = await createCustomer(user);

		assert(userResult !== null, 'something went horribly wrong creating the customer late');

		user = userResult;
	}

	assert(user.polarCustomerId !== null, 'User should have a customerId now!');

	if (checkUserSubscription(user) !== null) {
		if (productId === user.polarSubscriptionPlanId) {
			redirect(303, '/account');
		}

		throw new Error('YOU HAVE A SUB (DONT SHIP THIS)');

		const customer = await polar.customers.getState({ id: user.polarCustomerId });

		const oldSubscription = customer.activeSubscriptions[0];

		assert(
			oldSubscription !== undefined,
			`${user.email} wasn't subscribed in polar but was subscribed in our database`
		);

		await polar.subscriptions.update({
			id: oldSubscription.id,
			subscriptionUpdate: { productId: productId, prorationBehavior: 'invoice' }
		});

		redirect(303, '/account');
	}

	redirect(303, `/api/checkout?products=${productId}&customerId=${user.polarCustomerId}`);
}
