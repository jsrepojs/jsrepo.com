import { auth } from '$lib/auth';
import { redirectToLogin } from '$lib/auth/redirect';
import { hasScopeAccess } from '$lib/backend/db/functions';
import { redirect } from '@sveltejs/kit';

export async function load({ request, url, params }) {
	const session = await auth.api.getSession({ headers: request.headers });

	if (!session) redirectToLogin(url);

	const scopeName = params.scope.slice(1);

	if (!(await hasScopeAccess(session.user.id, scopeName))) {
		redirect(303, `/${params.scope}`);
	}

	return {};
}
