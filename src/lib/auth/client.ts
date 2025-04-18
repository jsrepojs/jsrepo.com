import { createAuthClient } from 'better-auth/svelte';
import { apiKeyClient } from 'better-auth/client/plugins';
import { stripeClient } from '@better-auth/stripe/client';

export const authClient = createAuthClient({
	plugins: [
		apiKeyClient(),
		stripeClient({
			subscription: true,
		})
	]
});
