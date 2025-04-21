import { POLAR_WEBHOOK_SECRET } from '$env/static/private';
import { db } from '$lib/backend/db';
import { Webhooks } from '@polar-sh/sveltekit';
import * as tables from '$lib/backend/db/schema';
import { and, eq } from 'drizzle-orm';
import assert from 'assert';

export const POST = Webhooks({
	webhookSecret: POLAR_WEBHOOK_SECRET,
	onSubscriptionActive: async (payload) => {
		const userId = payload.data.customer.externalId;

		assert(
			userId !== null,
			`ExternalId was not defined for customer ${payload.data.customer.email}`
		);

		const productId = payload.data.productId;

		await db
			.update(tables.user)
			.set({ polarSubscriptionPlanId: productId, polarSubscriptionPlanEnd: payload.data.endsAt })
			.where(eq(tables.user.id, userId));
	},
	onOrderCreated: async (payload) => {
		// subscription renewal
		if (payload.data.billingReason === 'subscription_cycle') {
			const userId = payload.data.customer.externalId;

			assert(
				userId !== null,
				`ExternalId was not defined for customer ${payload.data.customer.email}`
			);

			const productId = payload.data.productId;

			await db
				.update(tables.user)
				.set({
					polarSubscriptionPlanId: productId,
					polarSubscriptionPlanEnd: payload.data.subscription?.endsAt ?? null
				})
				.where(eq(tables.user.id, userId));
		}
	},
	onSubscriptionCanceled: async (payload) => {
		const userId = payload.data.customer.externalId;

		assert(
			userId !== null,
			`ExternalId was not defined for customer ${payload.data.customer.email}`
		);

		const productId = payload.data.productId;

		// users may still have access until the end of the period
		await db
			.update(tables.user)
			.set({ polarSubscriptionPlanId: productId, polarSubscriptionPlanEnd: payload.data.endsAt })
			.where(eq(tables.user.id, userId));
	},
	onSubscriptionRevoked: async (payload) => {
		// revoke access immediately
		const userId = payload.data.customer.externalId;

		assert(
			userId !== null,
			`ExternalId was not defined for customer ${payload.data.customer.email}`
		);

		const productId = payload.data.productId;

		await revokeSubscription(userId, productId);
	}
});

async function revokeSubscription(userId: string, productId: string) {
	await db
		.update(tables.user)
		.set({ polarSubscriptionPlanId: null, polarSubscriptionPlanEnd: null })
		// we check to make sure the plan we are canceling is active
		// to handle cases where webhooks may come out of order
		.where(and(eq(tables.user.id, userId), eq(tables.user.polarSubscriptionPlanId, productId)));
}
