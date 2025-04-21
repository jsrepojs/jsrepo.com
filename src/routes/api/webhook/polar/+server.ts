import { POLAR_WEBHOOK_SECRET } from '$env/static/private';
import { db } from '$lib/backend/db';
import { Webhooks } from '@polar-sh/sveltekit';
import * as tables from '$lib/backend/db/schema';
import { eq } from 'drizzle-orm';
import assert from 'assert';
import { revokeSubscription } from '$lib/backend/db/functions';

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
	onSubscriptionUpdated: async (payload) => {
		// handle un-cancel
		if (payload.data.status === 'active' && !payload.data.cancelAtPeriodEnd) {
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
