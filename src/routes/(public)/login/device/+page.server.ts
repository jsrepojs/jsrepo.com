import { auth } from '$lib/auth.js';
import { redirectToLogin } from '$lib/auth/redirect.js';
import { error } from '@sveltejs/kit';

export async function load({ locals, url, request }) {
	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const clientId = url.searchParams.get('client_id');

	if (!clientId) error(404, 'Client not found!');

	const client = await auth.api.getOAuthClient({
		params: { id: clientId },
		headers: request.headers
	});

	return {
		client
	};
}
