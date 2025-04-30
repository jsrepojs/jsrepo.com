import { getOrg, getUser } from '$lib/backend/db/functions.js';
import { PLANS } from '$lib/ts/stripe/client';
import { stripeClient } from '$lib/ts/stripe/index.js';
import { error, json } from '@sveltejs/kit';
import assert from 'assert';

export type UpdateSeatsRequest = {
	seats: number;
};

export async function PATCH({ locals, params, request }) {
	const session = await locals.auth();

	if (!session) error(401);

	const body = (await request.json()) as UpdateSeatsRequest;

	if (typeof body?.seats !== 'number')
		error(400, 'expected a value for `seats` in the request body');

	const orgName = params.org;

	const [org, user] = await Promise.all([getOrg({ name: orgName }), getUser(session.user.id)]);

	assert(user !== null, 'user must be defined');

	if (!org) error(404);

	if (org.subscription === null) error(400, 'you need to have a subscription to update it');

	const member = org.members.find((m) => m.userId === session.user.id && m.role === 'owner');

	if (!member) error(401, 'you must be the owner of this org to update it');

	if (member.user.stripeCustomerId !== org.subscription.stripeCustomerId) {
		error(400, 'you are not the person who setup this subscription');
	}

	// you always get 1 free seat for the owner who's paying for Pro
	if (org.members.length - 1 > body.seats) error(400, 'you cannot have less seats than members');

	assert(org.subscription.stripeSubscriptionId !== null, 'must be defined');

    const subscription = await stripeClient.subscriptions.retrieve(org.subscription.stripeSubscriptionId);

    const itemId = subscription.items.data[0]?.id;

    if (!itemId) error(400, 'error getting your subscription');

	await stripeClient.subscriptions.update(org.subscription.stripeSubscriptionId, {
		items: [
			{
				id: itemId,
				price: PLANS['organizationSeat'].priceId,
				quantity: body.seats
			}
		]
	});

	return json({});
}
