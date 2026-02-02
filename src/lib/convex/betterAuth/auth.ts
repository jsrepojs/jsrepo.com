/**
 * Generate with 
 * `pnpm dlx @better-auth/cli generate --config ./src/lib/convex/betterAuth/auth.ts --output ./src/lib/convex/betterAuth/schema.ts`
 */

import { createClient } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import type { GenericCtx } from '@convex-dev/better-auth/utils';
import type { BetterAuthOptions } from 'better-auth';
import { betterAuth } from 'better-auth';
import { components } from '../_generated/api';
import type { DataModel } from '../_generated/dataModel';
import authConfig from '../auth.config';
import schema from './schema';
import { admin, apiKey } from 'better-auth/plugins';

export const authComponent = createClient<DataModel, typeof schema>(components.betterAuth, {
	local: { schema },
	verbose: false
});

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
	return {
		appName: 'jsrepo.com',
		baseURL: process.env.SITE_URL,
		secret: process.env.BETTER_AUTH_SECRET,
		database: authComponent.adapter(ctx),
		trustedOrigins: ['https://www.jsrepo.com'],
        user: {
            additionalFields: {
                username: {
                    type: 'string',
                    required: false,
                    defaultValue: null,
                    unique: true
                },
                scopeLimit: {
                    type: 'number',
                    required: true,
                    defaultValue: 5,
                },
            }
        },
		socialProviders: {
			github: {
				clientId: process.env.GITHUB_CLIENT_ID ?? '',
				clientSecret: process.env.GITHUB_CLIENT_SECRET
			}
		},
		plugins: [
			convex({ authConfig }),
			apiKey({
				defaultPrefix: 'jsrepo_',
				rateLimit: {
					enabled: false
				}
			}),
			admin(),
            // TODO: Add back stripe plugin (or just drop stripe altogether)
		]
	} satisfies BetterAuthOptions;
};

export const options = createAuthOptions({} as GenericCtx<DataModel>);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
	return betterAuth(createAuthOptions(ctx));
};
