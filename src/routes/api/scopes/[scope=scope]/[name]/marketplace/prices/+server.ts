import {
	canPublishToScope,
	getRegistry,
	getRegistryPrices,
	getScope,
	getUser
} from '$lib/backend/db/functions.js';
import { db } from '$lib/backend/db/index.js';
import { validateRequest } from '$lib/ts/http/request.js';
import { MAX_PRICE, MIN_PRICE } from '$lib/ts/stripe/connect.js';
import { error, json } from '@sveltejs/kit';
import assert from 'assert';
import * as v from 'valibot';
import * as tables from '$lib/backend/db/schema.js';

const schema = v.object({
	individualPrice: v.pipe(v.number(), v.minValue(MIN_PRICE), v.maxValue(MAX_PRICE)),
	orgPrice: v.pipe(v.number(), v.minValue(MIN_PRICE), v.maxValue(MAX_PRICE))
});

export type CreateRegistryPricesRequest = v.InferOutput<typeof schema>;

export async function POST({ locals, request, params }) {
	const body = await validateRequest(schema, request);

	const scopeName = params.scope.slice(1);
	const { name } = params;

	const session = await locals.auth();

	if (!session) error(401);

	const [user, scope, registry, prices] = await Promise.all([
		getUser({ id: session.user.id }),
		getScope(scopeName),
		getRegistry({ scopeName, registryName: name, userId: session.user.id }),
		getRegistryPrices({ scopeName, name })
	]);

	assert(user !== null, 'user must be defined');

	if (scope === null) error(404);

	if (!registry) error(404);

	if (prices.length > 0) error(400, 'this is meant only for initial setup');

	const canPublish = await canPublishToScope(user, scope, registry.access);

	if (!canPublish.canPublish)
		error(401, 'you do not have permission to manage the pricing for this registry');

	const result = await db.transaction(async (tx) => {
		const res = await tx.insert(tables.registryPrice).values([
			{ registryId: registry.id, target: 'individual', cost: body.individualPrice * 100 },
			{ registryId: registry.id, target: 'org', cost: body.orgPrice * 100 }
		]).returning();

		if (res.length !== 2) {
			tx.rollback();
		}

		return true;
	});

	if (!result) error(500, 'there was an error creating the prices');

	return json({});
}
