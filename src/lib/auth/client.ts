import { createAuthClient } from 'better-auth/svelte';
import { apiKeyClient, oidcClient } from 'better-auth/client/plugins';
import { stripeClient } from '@better-auth/stripe/client';

export const authClient = createAuthClient({
	plugins: [apiKeyClient(), oidcClient(), stripeClient()]
});
