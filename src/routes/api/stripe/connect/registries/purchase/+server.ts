import { getRegistryPrice, getUser, referenceIdCanPurchase } from '$lib/backend/db/functions.js';
import { validateRequest } from '$lib/ts/http/request.js';
import { posthog } from '$lib/ts/posthog';
import { calculateDiscountedPrice, calculatePlatformFee } from '$lib/ts/stripe/connect';
import { stripeClient } from '$lib/ts/stripe/index.js';
import { error, json } from '@sveltejs/kit';
import { waitUntil } from '@vercel/functions';
import assert from 'assert';
import * as v from 'valibot';

const schema = v.object({
	registryId: v.number(),
	priceId: v.number(),
	referenceId: v.string()
});

export type PurchaseRegistryRequest = v.InferOutput<typeof schema>;

export async function POST({ locals, url, request }) {
	const body = await validateRequest(schema, request);

	const session = await locals.auth();

	if (!session) error(401);

	const user = await getUser({ id: session.user.id });

	assert(user !== null, 'user must be defined');
	assert(user.stripeCustomerId !== null, 'user must have a customer id');

	// up here we need to check if we already have access to this registry

	const [registryPrice, canPurchase] = await Promise.all([
		getRegistryPrice(body.priceId),
		referenceIdCanPurchase(body.referenceId, body.registryId)
	]);

	if (canPurchase === null) error(404);
	if (!canPurchase.canPurchase) error(400, 'You have already purchased this');

	if (!registryPrice) error(404);

	if (registryPrice.target === 'org' && canPurchase.user !== undefined) {
		error(400, 'this product is intended for organizations not individuals');
	}

	if (registryPrice.target === 'individual' && canPurchase.org !== undefined) {
		error(400, 'this product is intended for individuals not organizations');
	}

	const { price } = calculateDiscountedPrice(registryPrice);
	const registryName = `@${registryPrice.scope.name}/${registryPrice.registry.name}`;

	// get this from the owner of the registry
	const connectedAccountId = registryPrice.registry.stripeConnectAccountId;
	const listOnMarketplace = registryPrice.registry.listOnMarketplace;

	if (connectedAccountId === null) error(404);
	if (!listOnMarketplace) error(404);

	const fee = calculatePlatformFee(registryPrice.cost);

	const checkoutSession = await stripeClient.checkout.sessions.create({
		customer: user.stripeCustomerId,
		line_items: [
			{
				price_data: {
					currency: 'usd',
					product_data: {
						name:
							registryPrice.target === 'org'
								? `Organization License for ${registryName}`
								: `Individual License for ${registryName}`,
						description:
							registryPrice.target === 'org'
								? `Lifetime Organization License to ${registryName} for ${canPurchase.org?.name}.`
								: `Lifetime Individual License for ${registryName}.`,
						metadata: {
							registryId: registryPrice.registry.id
						}
					},
					unit_amount: price
				},
				quantity: 1
			}
		],
		metadata: {
			registryId: registryPrice.registry.id,
			referenceId: body.referenceId // user or org
		},
		payment_intent_data: {
			application_fee_amount: fee,
			transfer_data: {
				destination: connectedAccountId
			}
		},
		mode: 'payment',
		success_url: `${url.origin}/${registryName}`
	});

	posthog.capture({
		distinctId: user.id,
		event: 'registry-purchase',
		properties: {
			registryId: registryPrice.registry.id,
			registryName: registryName,
			purchaserEmail: user.email
		}
	});

	waitUntil(posthog.shutdown());

	return json(checkoutSession);
}
