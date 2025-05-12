import { canPublishToScope, getRegistry, getScope, getUser } from '$lib/backend/db/functions.js';
import { db } from '$lib/backend/db/index.js';
import { validateRequest } from '$lib/ts/http/request.js';
import {
	calculateDiscountedPrice,
	calculatePlatformFee,
	MAX_PRICE,
	MIN_PRICE
} from '$lib/ts/stripe/connect.js';
import { error, json } from '@sveltejs/kit';
import assert from 'assert';
import * as v from 'valibot';
import * as tables from '$lib/backend/db/schema.js';
import { eq } from 'drizzle-orm';

const schema = v.pipe(
	v.object({
		cost: v.pipe(v.number(), v.minValue(MIN_PRICE), v.maxValue(MAX_PRICE)),
		discount: v.nullable(v.pipe(v.number(), v.minValue(1), v.maxValue(100))),
		discountUntil: v.nullable(v.pipe(v.string(), v.isoTimestamp()))
	}),
	v.check((input) => {
		const discountedPrice = calculateDiscountedPrice({ ...input, cost: input.cost * 100 } as never);

		if (discountedPrice.price < 0) return false;

		const fee = calculatePlatformFee(discountedPrice.price);

		if (fee > discountedPrice.price) return false;

		return true;
	}, 'this price / discount combo results in negative income')
);

export type UpdateRegistryPriceRequest = v.InferOutput<typeof schema>;

export async function PATCH({ locals, request, params }) {
	const body = await validateRequest(schema, request);

	const cost = body.cost * 100;
	const discountUntil = body.discountUntil ? new Date(body.discountUntil) : null;

	if (discountUntil !== null && discountUntil.valueOf() < Date.now()) error(400, 'invalid discount expiration date');

	const scopeName = params.scope.slice(1);
	const priceId = parseInt(params.id);
	const { name } = params;

	const session = await locals.auth();

	if (!session) error(401);

	const [user, scope, registry] = await Promise.all([
		getUser({ id: session.user.id }),
		getScope(scopeName),
		getRegistry({ scopeName, registryName: name, userId: session.user.id })
	]);

	assert(user !== null, 'user must be defined');

	if (scope === null) error(404);

	if (!registry) error(404);

	const canPublish = await canPublishToScope(user, scope, registry.access);

	if (!canPublish.canPublish)
		error(401, 'you do not have permission to manage the pricing for this registry');

	const result = await db.transaction(async (tx) => {
		const res = await db
			.update(tables.registryPrice)
			.set({
				cost,
				discount: body.discount,
				discountUntil
			})
			.where(eq(tables.registryPrice.id, priceId)).returning();

		if (res.length === 0) {
			tx.rollback();
		}

		return true;
	});

	if (!result) error(500, 'there was an error updating the price');

	return json({});
}
