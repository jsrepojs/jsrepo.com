import { createAnonSessionCode } from '$lib/backend/db/functions.js';
import { error, json } from '@sveltejs/kit';

export async function POST({ locals, params }) {
	const session = await locals.auth();

	if (!session) error(401);

	const sessionId = params.sessionId;

	const created = await createAnonSessionCode(session.user, sessionId);

	if (!created) error(500, 'error creating the code');

	return json({});
}
