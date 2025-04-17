import { page } from "$app/state";
import type { Providers } from "$lib/auth";
import { authClient } from "../client";
import { getRedirectTo } from "../redirect";

export async function signIn(provider: Providers) {
    await authClient.signIn.social({
        provider,
        callbackURL: getRedirectTo(page.url) ?? '/dashboard'
    });
}