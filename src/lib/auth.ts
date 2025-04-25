import { betterAuth } from 'better-auth';
import { apiKey, createAuthMiddleware, admin } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './backend/db';
import * as schema from './backend/db/schema';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private';
import { polar } from './ts/polar';
import { getUser } from './backend/db/functions';
import assert from 'assert';
import { postHogClient } from './ts/posthog';
import { eq } from 'drizzle-orm';
import { resend, welcomeEmail } from './ts/resend';

export type Providers = 'github';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema
	}),
	plugins: [
		apiKey({
			rateLimit: {
				enabled: false
			}
		}),
		admin()
	],
	socialProviders: {
		github: {
			clientId: GITHUB_CLIENT_ID,
			clientSecret: GITHUB_CLIENT_SECRET
		}
	},
	hooks: {
		after: createAuthMiddleware(async (ctx) => {
			// there's no good way to determine if a user has an account and is banned or if the user doesn't exist
			// if (ctx.context.returned instanceof APIError) {
			// 	const returned = ctx.context.returned;

			// 	if (returned.body?.code === "BANNED_USER") {
			// 		throw ctx.redirect('/account-suspended')
			// 	}
			// }

			// create polar customer id and sync subscription on sign in
			if (ctx.path.startsWith('/callback')) {
				const newSession = ctx.context.newSession;

				if (newSession) {
					let user: schema.User | null = null;

					try {
						user = await getUser(newSession.user.id);

						assert(user !== null, 'User must be defined');

						// create a new polar customer id on the first sign in
						if (user.polarCustomerId === null) {
							const res = resend.emails.send(welcomeEmail(user));

							const result = await polar.customers.create({
								externalId: newSession.user.id,
								name: newSession.user.name,
								email: newSession.user.email
							});

							await db
								.update(schema.user)
								.set({ polarCustomerId: result.id })
								.where(eq(schema.user.id, user.id));

							await res;
						} else {
							// sync the current subscription with the database
							// it should already by synced by the webhooks but this is a precautionary measure
							const result = await polar.customers.getState({ id: user.polarCustomerId });

							// we should only ever have 1 active subscription
							if (result.activeSubscriptions.length > 0) {
								const subscription = result.activeSubscriptions[0];

								// if the active subscription doesn't match the polar db then update it
								if (subscription.productId === user.polarSubscriptionPlanId) {
									await db
										.update(schema.user)
										.set({ polarSubscriptionPlanId: subscription.productId })
										.where(eq(schema.user.id, user.id));
								}
							} else if (
								user.polarSubscriptionPlanId !== null ||
								user.polarSubscriptionPlanEnd !== null
							) {
								// remove the subscription plan id if the user isn't subscribed
								await db
									.update(schema.user)
									.set({ polarSubscriptionPlanId: null, polarSubscriptionPlanEnd: null })
									.where(eq(schema.user.id, user.id));
							}
						}
					} catch (err) {
						postHogClient.captureException(err, user?.id, { path: ctx.path });
						await postHogClient.shutdown();
					}
				}
			}
		})
	}
});
