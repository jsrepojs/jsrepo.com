import { getUser } from '$lib/backend/db/functions.js';
import { stripeClient } from '$lib/ts/stripe/index.js';
import { error, json } from '@sveltejs/kit';
import assert from 'assert';

export async function POST({ locals }) {
	const session = await locals.auth();

	if (!session) error(401);

	const user = await getUser({ id: session.user.id });

	assert(user !== null, 'user must exist');

	if (user.stripeSellerAccountId === null) error(404, 'linked account not found');

	const link = await stripeClient.accounts.createLoginLink(user.stripeSellerAccountId);

	return json(link);
}
