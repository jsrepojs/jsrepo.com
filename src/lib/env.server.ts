import { createEnv } from '@t3-oss/env-core';
import { vercel } from '@t3-oss/env-core/presets-zod';
import { z } from 'zod';

const _env = createEnv({
	server: {
		// convex
		// DO NOT REMOVE THIS DEFAULT VALUE. It will be replaced in the build process
		PUBLIC_CONVEX_URL: z.url().default('{{CONVEX_URL_FROM_CLI}}'),
		PUBLIC_WORKOS_CLIENT_ID: z.string(),

		// auth
		BETTER_AUTH_SECRET: z.string(),
		GITHUB_CLIENT_ID: z.string(),
		GITHUB_CLIENT_SECRET: z.string(),

		// r2
		R2_TOKEN: z.string(),
		R2_ACCESS_KEY_ID: z.string(),
		R2_SECRET_ACCESS_KEY: z.string(),
		R2_ENDPOINT: z.url(),
		R2_BUCKET: z.string()
	},
	emptyStringAsUndefined: true,
	runtimeEnv: process.env,
	extends: [vercel()]
});

export const env = {
	..._env,
	PUBLIC_CONVEX_SITE_URL: _env.PUBLIC_CONVEX_URL.replace('.convex.cloud', '.convex.site')
};
