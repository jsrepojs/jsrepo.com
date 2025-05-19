import { redirectToLogin } from '$lib/auth/redirect';
import { getMyLicenses } from '$lib/backend/db/functions';

export async function load({ locals, url }) {
	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const licenses = await getMyLicenses(session.user.id);

	return {
		licenses
	};
}
