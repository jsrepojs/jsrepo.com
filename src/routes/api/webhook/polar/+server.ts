import { POLAR_WEBHOOK_SECRET } from '$env/static/private';
import { db } from '$lib/backend/db';
import { Webhooks } from '@polar-sh/sveltekit';
import * as tables from '$lib/backend/db/schema';
import { and, eq } from 'drizzle-orm';
import assert from 'assert';

export const POST = Webhooks({
	webhookSecret: POLAR_WEBHOOK_SECRET,
	onSubscriptionCreated: async (payload) => {
		const userId = payload.data.customer.externalId;

		assert(
			userId !== null,
			`ExternalId was not defined for customer ${payload.data.customer.email}`
		);

		const productId = payload.data.productId;

		await db
			.update(tables.user)
			.set({ polarSubscriptionPlanId: productId })
			.where(eq(tables.user.id, userId));
	},
	onSubscriptionCanceled: async (payload) => {
		const userId = payload.data.customer.externalId;

		assert(
			userId !== null,
			`ExternalId was not defined for customer ${payload.data.customer.email}`
		);

		const productId = payload.data.productId;

		await db
			.update(tables.user)
			.set({ polarSubscriptionPlanId: null })
			// we check to make sure the plan we are canceling is active 
            // to handle cases where webhooks may come out of order
			.where(and(eq(tables.user.id, userId), eq(tables.user.polarSubscriptionPlanId, productId)));
	}
});
