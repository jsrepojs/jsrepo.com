import { getUser } from '$lib/backend/db/functions.js';
import { posthog } from '$lib/ts/posthog';
import { stripeClient } from '$lib/ts/stripe/index.js';
import { error, json } from '@sveltejs/kit';
import { waitUntil } from '@vercel/functions';
import assert from 'assert';

export async function POST({ locals, url }) {
	const session = await locals.auth();

	if (!session) error(401);

	const user = await getUser({ id: session.user.id });

	assert(user !== null, 'user must be defined');
	assert(user.stripeCustomerId !== null, 'user must have a customer id');

	// up here we need to check if we already have access to this registry

	// get this from the registry
	const registryCost = 100 * 100; // $100

	const registry = {
		id: 1,
		name: 'pro',
		cost: 100 * 100, // $100
		scope: {
			name: 'bits'
		}
	};

	const registryName = `@${registry.scope.name}/${registry.name}`;

	// get this from the owner of the registry
	const connectedAccountId = 'acct_1RLqm5QCizqGwQbM';

	const fee = calculatePlatformFee(registryCost);

	const checkoutSession = await stripeClient.checkout.sessions.create({
		customer: user.stripeCustomerId,
		line_items: [
			{
				price_data: {
					currency: 'usd',
					product_data: {
						name: registryName,
						description: `Private access to ${registryName}`,
						metadata: {
							registryId: registry.id
						}
					},
					unit_amount: registryCost
				},
				quantity: 1
			}
		],
		metadata: {
			registryId: registry.id,
			referenceId: session.user.id // user or org
		},
		payment_intent_data: {
			application_fee_amount: fee,
			transfer_data: {
				destination: connectedAccountId
			}
		},
		mode: 'payment',
		// success_url: `${url.origin}/${registryName}`
		success_url: `${url.origin}/account`
	});

	posthog.capture({
		distinctId: user.id,
		event: 'registry-purchase',
		properties: {
			registryId: registry.id,
			registryName: registryName,
			purchaserEmail: user.email
		}
	});

	waitUntil(posthog.shutdown());

	return json(checkoutSession);
}

/** 10% + 30¢ (negotiable)
 *
 * @param transactionCost cost in cents
 * @returns
 */
function calculatePlatformFee(transactionCost: number) {
	return transactionCost * 0.1 + 30;
}
