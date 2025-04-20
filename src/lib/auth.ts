import { betterAuth } from 'better-auth';
import { apiKey, createAuthMiddleware } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './backend/db';
import * as schema from './backend/db/schema';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private';
import { polar } from './ts/polar';
import { getUser } from './backend/db/functions';
import assert from 'assert';

export type Providers = 'github';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema
	}),
	plugins: [
		apiKey({
			rateLimit: {
				enabled: false,
				timeWindow: 1000 * 60 * 60 * 24, // 1 day
				maxRequests: 10 // 10 requests per day
			}
		})
	],
	socialProviders: {
		github: {
			clientId: GITHUB_CLIENT_ID,
			clientSecret: GITHUB_CLIENT_SECRET
		}
	},
	hooks: {
		after: createAuthMiddleware(async (ctx) => {
			if (ctx.path.startsWith('/callback')) {
				// create polar customer id on sign in
				const newSession = ctx.context.newSession;

				if (newSession) {
					try {
						const user = await getUser(newSession.user.id);

						assert(user !== null, 'User must be defined');

						if (user.polarCustomerId === null) {
							const result = await polar.customers.create({
								externalId: newSession.user.id,
								name: newSession.user.name,
								email: newSession.user.email
							});

							await db.update(schema.user).set({ polarCustomerId: result.id });
						}
					} catch (err) {
						console.log(err);
					}
				}
			}
		})
	}
});
