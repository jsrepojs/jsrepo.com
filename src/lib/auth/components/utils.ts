import { page } from '$app/state';
import type { Providers } from '$lib/auth';
import { authClient } from '../client';
import { getRedirectTo } from '../redirect';
import { goto } from '$app/navigation';

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
