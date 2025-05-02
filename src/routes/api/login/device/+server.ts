import { createAnonSession } from '$lib/backend/db/functions.js';
import { validateRequest } from '$lib/ts/http/request';
import { error, json } from '@sveltejs/kit';
import * as v from 'valibot';

const schema = v.object({
	hardwareId: v.pipe(v.string(), v.minLength(1))
});

export async function POST({ request }) {
	const body = await validateRequest(schema, request);

	const session = await createAnonSession(body.hardwareId);

	if (!session) error(500, 'error creating anonymous session');

	return json({ id: session.id });
}
