import { acceptScopeTransferRequest, getScopeTransferRequest } from '$lib/backend/db/functions';
import { db } from '$lib/backend/db/index.js';
import { validateRequest } from '$lib/ts/http/request.js';
import { resend, scopeTransferredEmail } from '$lib/ts/resend';
import { error, json } from '@sveltejs/kit';
import * as v from 'valibot';

const schema = v.object({
	requestId: v.number()
});

export type AcceptTransferRequest = v.InferOutput<typeof schema>;

export async function PATCH({ request, params, locals }) {
	const scopeName = params.scope.slice(1);

	const body = await validateRequest(schema, request);

	const session = await locals.auth();

	if (!session) error(401);

	const transferRequest = await getScopeTransferRequest(body.requestId);

	if (transferRequest === null) {
		error(404);
	}

	if (scopeName.toLowerCase() !== transferRequest.scope.name.toLowerCase()) {
		error(400, 'this transfer request references a different scope');
	}

	if (transferRequest.user.id !== session.user.id) {
		error(401, 'this transfer request is not intended for you');
	}

	if (transferRequest.scope_transfer_request.acceptedAt !== null) {
		error(400, 'this request has already been accepted');
	}

	if (transferRequest.scope_transfer_request.rejectedAt !== null) {
		error(400, 'this request has already been rejected');
	}

	// accept the transfer request and transfer the scope

	const result = await db.transaction(async (tx) =>
		acceptScopeTransferRequest(tx, transferRequest.scope_transfer_request)
	);

	if (!result) error(500, 'there was an error transferring the scope');

	await resend.emails.send(
		scopeTransferredEmail({
			newOwner: session.user,
			newOwnerName: transferRequest.org ? transferRequest.org.name : 'you',
			scopeName
		})
	);

	return json({});
}
