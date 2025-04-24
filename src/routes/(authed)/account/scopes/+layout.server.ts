import { redirectToLogin } from '$lib/auth/redirect';
import { getTransferRequestInbox } from '$lib/backend/db/functions.js';

export async function load({ locals, url }) {
	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const transferRequestInbox = await getTransferRequestInbox(session.user.id);

	return {
		transferRequestInbox
	};
}
