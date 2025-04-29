import { page } from '$app/state';
import type { Providers } from '$lib/auth';
import { authClient } from '../client';
import { getRedirectTo } from '../redirect';
import { goto } from '$app/navigation';
import type { PlanName } from '$lib/ts/stripe/client';

export async function signIn(provider: Providers) {
	await authClient.signIn.social({
		provider,
		callbackURL: getRedirectTo(page.url) ?? '/account'
	});
}

export async function signOut() {
	await authClient.signOut({
		fetchOptions: {
			onSuccess: async () => {
				if (page.url.pathname.startsWith('/account')) {
					await goto('/');
				}
			}
		}
	});
}

export async function upgradeSubscription({
	plan,
	successUrl = '/account',
	annual = false,
	seats,
	userId
}: {
	plan: PlanName;
	annual?: boolean;
	successUrl?: string;
	seats?: number;
	userId: string;
}) {
	const response = await authClient.subscription.upgrade({
		plan,
		successUrl,
		annual,
		cancelUrl: '/pricing',
		referenceId: userId,
		seats
	});

	return response;
}
