import { activateKey } from '$lib/backend/db/functions.js';
import { validateRequest } from '$lib/ts/http/request.js';
import { error, text } from '@sveltejs/kit';
import * as v from 'valibot';

const schema = v.object({
	hardwareId: v.pipe(v.string(), v.minLength(1))
});

export async function PATCH({ params, request }) {
	const body = await validateRequest(schema, request);

	const key = await activateKey(params.sessionId, body.hardwareId);

	if (!key) error(404);

	return text(key);
}
