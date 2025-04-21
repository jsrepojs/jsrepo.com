import { auth } from '$lib/auth.js';
import { redirectToLogin } from '$lib/auth/redirect.js';
import { getUser } from '$lib/backend/db/functions.js';
import { checkUserSubscription } from '$lib/ts/polar/client.js';
import { polar } from '$lib/ts/polar/index.js';
import { redirect } from '@sveltejs/kit';
import assert from 'assert';

export async function GET({ url, request }) {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session) redirectToLogin(url);

	const user = await getUser(session.user.id);

	assert(user !== null, 'User should be defined!');
	assert(user.polarCustomerId !== null, 'User should have a customerId!');

	const productId = url.searchParams.get('product');

	if (!productId) redirect(303, '/pricing');

	if (checkUserSubscription(user) !== null) {
		if (productId === user.polarSubscriptionPlanId) {
			redirect(303, '/account');
		}

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
