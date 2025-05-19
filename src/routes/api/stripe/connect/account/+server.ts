import { updateUserConnectAccountId } from '$lib/backend/db/functions.js';
import { stripeClient } from '$lib/ts/stripe';
import { error, json } from '@sveltejs/kit';

export async function POST({ locals, url }) {
	const session = await locals.auth();

	if (!session) error(401);

	const account = await stripeClient.accounts.create({
		controller: {
			stripe_dashboard: {
				type: 'express'
			},
			fees: {
				payer: 'application'
			},
			losses: {
				payments: 'application'
			}
		},
		email: session.user.email,
		metadata: {
			userId: session.user.id
		}
	});

	const result = await updateUserConnectAccountId(session.user.id, account.id);

	if (!result) error(500, 'error updating your account');

	const accountLink = await stripeClient.accountLinks.create({
		account: account.id,
		return_url: `${url.origin}/account`,
		refresh_url: `${url.origin}/account`,
		type: 'account_onboarding'
	});

	return json(accountLink);
}
