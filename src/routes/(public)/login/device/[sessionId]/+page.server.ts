import { redirectToLogin } from '$lib/auth/redirect.js';
import {
	createAnonSessionCode,
	getAnonSession,
	getAnonSessionCodes,
	hasAnonSessionCode,
	useAnonSessionCode
} from '$lib/backend/db/functions';
import { error } from '@sveltejs/kit';
import { fail, message, superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { schema } from './schema.js';
import { verify } from '$lib/ts/crypto.js';
import type { AnonSessionCode } from '$lib/backend/db/schema.js';

export async function load({ locals, url, params }) {
	const session = await locals.auth();

	if (!session) redirectToLogin(url);

	const sessionId = params.sessionId;

	const [anonSession, hasCode] = await Promise.all([
		getAnonSession(sessionId),
		hasAnonSessionCode(session.user.id, sessionId)
	]);

	if (!anonSession) error(404);

	if (
		anonSession.authorizedToUserId !== null &&
		anonSession.authorizedToUserId !== session.user.id
	) {
		error(404);
	}

	let hasSentCode = hasCode;

	if (!hasCode) {
		hasSentCode = await createAnonSessionCode(session.user, sessionId);
	}

	const form = await superValidate(valibot(schema));

	return {
		form,
		success: anonSession.authorizedToUserId === session.user.id,
		expires: anonSession.expires,
		hasSentCode
	};
}

export const actions = {
	default: async ({ request, locals, url, params }) => {
		const session = await locals.auth();

		if (!session) redirectToLogin(url);

		const form = await superValidate(request, valibot(schema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const sessionId = params.sessionId;

		const codes = await getAnonSessionCodes(session.user.id, sessionId);

		let sessionCode: AnonSessionCode | null = null;

		for (const code of codes) {
			if (!verify(form.data.code, code.codeHash)) continue;

			sessionCode = code;
		}

		if (sessionCode === null) {
			error(400, {
				message: 'Incorrect code!'
			});
		}

		const key = await useAnonSessionCode(sessionCode, request.headers);

		if (!key) {
			error(500, { message: 'Error using code.' });
		}

		return message(form, { message: 'success' });
	}
};
