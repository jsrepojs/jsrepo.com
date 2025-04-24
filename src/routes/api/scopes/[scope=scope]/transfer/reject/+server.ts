import { auth } from "$lib/auth";
import { getScopeTransferRequest, rejectScopeTransferRequest } from "$lib/backend/db/functions";
import { error, json } from "@sveltejs/kit";

export type RejectTransferRequest = {
	requestId: number;
};

export async function PATCH({ request, params }) {
	const scopeName = params.scope.slice(1);

	const body = (await request.json()) as RejectTransferRequest;

	if (!body.requestId) error(400, 'expected requestId in the request body');

	const session = await auth.api.getSession({ headers: request.headers });

	if (!session) error(401);

	const transferRequest = await getScopeTransferRequest(body.requestId);

	if (transferRequest === null) {
		error(404)
	}

	if (scopeName !== transferRequest.scope.name) {
		error(400, 'this transfer request references a different scope');
	}

	if (transferRequest.user.id !== session.user.id) {
		error(401, 'this transfer request is not intended for you');
	}

	if (transferRequest.scope_transfer_request.acceptedAt !== null) {
		error(400, 'this request has already been accepted')
	}

	if (transferRequest.scope_transfer_request.rejectedAt !== null) {
		error(400, 'this request has already been rejected')
	}

	await rejectScopeTransferRequest(body.requestId);

	return json({});
}