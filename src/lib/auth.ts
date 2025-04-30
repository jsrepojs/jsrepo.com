import { betterAuth } from 'better-auth';
import { apiKey, admin } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './backend/db';
import * as schema from './backend/db/schema';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { resend, welcomeEmail } from './ts/resend';
import { stripe } from '@better-auth/stripe';
import { stripeClient } from './ts/stripe';
import { plans } from './ts/stripe/client';
import { getOrg, getUser } from './backend/db/functions';
import assert from 'assert';

export type Providers = 'github';

export const auth = betterAuth({
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
