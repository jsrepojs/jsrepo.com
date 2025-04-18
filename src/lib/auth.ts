import { betterAuth } from 'better-auth';
import { apiKey } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './backend/db';
import * as schema from './backend/db/schema';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private';

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
	}
});
