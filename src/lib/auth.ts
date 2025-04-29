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
