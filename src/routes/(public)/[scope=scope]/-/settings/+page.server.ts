import { auth } from '$lib/auth';
import { redirectToLogin } from '$lib/auth/redirect';
import { getActiveTransferRequest, hasScopeAccess } from '$lib/backend/db/functions';
import { redirect } from '@sveltejs/kit';

export async function load({ request, url, params }) {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session) redirectToLogin(url);

	const scopeName = params.scope.slice(1);

	const [hasAccess, activeTransferRequest] = await Promise.all([hasScopeAccess(session.user.id, scopeName), getActiveTransferRequest(scopeName)])

	if (!hasAccess) {
		redirect(303, `/${params.scope}`);
	}

	return {
		activeTransferRequest
	};
}
