import { auth } from '$lib/auth';
import { redirectToLogin } from '$lib/auth/redirect';

export async function load({ url, request }) {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session) redirectToLogin(url);

	return {
		session
	};
}
