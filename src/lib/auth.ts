import { betterAuth } from 'better-auth';
import { apiKey, admin, oidcProvider } from 'better-auth/plugins';
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
import { createMarketPurchase, deleteMarketPurchase } from './backend/db/functions';
import assert from 'assert';
import { posthog } from './ts/posthog';
import { waitUntil } from '@vercel/functions';

export type Providers = 'github';

export const auth = betterAuth({
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema
	}),
	trustedOrigins: ['https://www.jsrepo.com'],
	plugins: [
		apiKey({
			defaultPrefix: 'jsrepo_',
			rateLimit: {
				enabled: false
			}
		}),
		oidcProvider({
			loginPage: '/login/device',
		}),
		admin(),
		stripe({
			stripeClient,
			stripeWebhookSecret: STRIPE_WEBHOOK_SECRET,
			createCustomerOnSignUp: true,
			onEvent: async (event) => {
				if (event.type === 'charge.refunded') {
					await deleteMarketPurchase(event.data.object.payment_intent as string);
				}

				if (event.type === 'account.updated') {
					const account = event.data.object;

					if (account.charges_enabled && account.payouts_enabled) {
						const DELAY_DAYS = 30;
						const INTERVAL = 'monthly';
						const MONTHLY_ANCHOR = 1;

						const schedule = account.settings?.payouts?.schedule;

						// no need to update
						if (
							schedule &&
							schedule.delay_days === DELAY_DAYS &&
							schedule.interval === INTERVAL &&
							schedule.monthly_anchor === MONTHLY_ANCHOR
						)
							return;

						// update the user
						await stripeClient.accounts.update(account.id, {
							settings: {
								payouts: {
									schedule: {
										interval: INTERVAL,
										delay_days: DELAY_DAYS,
										monthly_anchor: MONTHLY_ANCHOR
									}
								}
							}
						});
					}
				}

				if (event.type === 'checkout.session.completed') {
					const { customer, metadata, payment_status, payment_intent } = event.data.object;

					assert(metadata !== null, 'there has been a big mistake!');

					const { referenceId, registryId } = metadata;

					await createMarketPurchase({
						referenceId,
						registryId: parseInt(registryId),
						status: payment_status,
						stripeCustomerId: customer as string,
						stripePurchaseIntentId: payment_intent as string
					});

					posthog.capture({
						distinctId: referenceId,
						event: 'registry-purchase',
						properties: {
							registryId,
							customer
						}
					});

					waitUntil(posthog.shutdown());
				}
			},
			onCustomerCreate: async ({ user }) => {
				await resend.emails.send(welcomeEmail(user));

				posthog.capture({
					distinctId: user.id,
					event: 'sign-up',
					properties: {
						name: user.name,
						email: user.email
					}
				});

				waitUntil(posthog.shutdown());
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
