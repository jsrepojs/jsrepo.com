import { betterAuth } from 'better-auth';
import { apiKey, admin } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './backend/db';
import * as schema from './backend/db/schema';
import {
	BETTER_AUTH_SECRET,
	GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET,
	STRIPE_WEBHOOK_SECRET
} from '$env/static/private';
import { resend, welcomeEmail } from './ts/resend';
import { stripe } from '@better-auth/stripe';
import { stripeClient } from './ts/stripe';
import { plans } from './ts/stripe/client';
import { getOrg, getUser, startCourtesyMonth } from './backend/db/functions';
import assert from 'assert';
import { eq, like, and, gt } from 'drizzle-orm';

export type Providers = 'github';

export const auth = betterAuth({
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema
	}),
	plugins: [
		apiKey({
			defaultPrefix: 'jsrepo_',
			rateLimit: {
				enabled: false
			}
		}),
		admin(),
		stripe({
			stripeClient,
			stripeWebhookSecret: STRIPE_WEBHOOK_SECRET,
			createCustomerOnSignUp: true,
			onCustomerCreate: async ({ user }) => {
				await resend.emails.send(welcomeEmail(user));
			},
			subscription: {
				enabled: true,
				onSubscriptionComplete: async ({ subscription }) => {
					if (subscription.referenceId.startsWith('org_')) {
						const org = await getOrg({ id: subscription.referenceId });

						// update members count
						await db
							.update(schema.subscription)
							.set({ members: org?.members.length ?? 1 })
							.where(eq(schema.subscription.id, subscription.id));
					}
				},
				onSubscriptionUpdate: async ({ subscription }) => {
					if (subscription.referenceId.startsWith('org_')) {
						const org = await getOrg({ id: subscription.referenceId });

						if (!org) return;

						// only the owner
						if (org.members.length <= 1) return;

						const neededSeats = org.members.length - 1;

						if (neededSeats <= (subscription.seats ?? 0)) {
							return;
						}

						// already exhausted the courtesy month
						if (
							org.courtesyMonthEndedAt !== null &&
							org.courtesyMonthEndedAt.valueOf() < Date.now()
						) {
							return;
						}

						// start a courtesy month
						await startCourtesyMonth(org.id);
					}
				},
				onSubscriptionDeleted: async ({ subscription }) => {
					if (subscription.referenceId.startsWith('org_')) {
						const org = await getOrg({ id: subscription.referenceId });

						if (!org) return;

						// only the owner
						if (org.members.length <= 1) return;

						// already exhausted the courtesy month
						if (
							org.courtesyMonthEndedAt !== null &&
							org.courtesyMonthEndedAt.valueOf() < Date.now()
						) {
							return;
						}

						// start a courtesy month
						await startCourtesyMonth(org.id);
					} else {
						// get any org subs this user is responsible for
						const orgSubscriptions = await db
							.select()
							.from(schema.subscription)
							.where(
								and(
									eq(schema.subscription.stripeCustomerId, subscription.stripeCustomerId ?? ''),
									eq(schema.subscription.status, 'active'),
									like(schema.subscription.referenceId, 'org_%'),
									gt(schema.subscription.members, 0)
								)
							);

						if (orgSubscriptions.length === 0) return;

						// start a courtesy month for any orgs that the user owns
						await Promise.all(orgSubscriptions.map((sub) => startCourtesyMonth(sub.referenceId)));
					}
				},
				authorizeReference: async ({ user, referenceId }) => {
					const isOrg = referenceId.startsWith('org_');

					const userWithSub = await getUser(user.id);

					// user can only create and manage subscriptions to an org if they have a subscription
					if (isOrg && userWithSub?.subscription === null) return false;

					if (!isOrg) {
						// don't create a duplicate subscription for the user
						if (userWithSub?.subscription !== null) {
							return false;
						}

						assert(
							referenceId === user.id,
							'user is trying to subscribe with a reference id that is not their own'
						);

						return true;
					}

					// check if user owns the org the id belongs to
					const org = await getOrg({ id: referenceId });

					if (org === null) return false;

					const member = org.members.find((m) => m.userId === user.id && m.role === 'owner');

					// user is not an owning member
					if (!member) {
						return false;
					}

					return true;
				},
				plans
			}
		})
	],
	socialProviders: {
		github: {
			clientId: GITHUB_CLIENT_ID,
			clientSecret: GITHUB_CLIENT_SECRET
		}
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60
		}
	}
});
