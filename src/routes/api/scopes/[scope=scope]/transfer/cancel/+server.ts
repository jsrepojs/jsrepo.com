import { deleteTransferRequest, isScopeOwner } from '$lib/backend/db/functions';
import { error, json } from '@sveltejs/kit';

export type CancelTransferRequestRequest = {
	requestId: number;
};

export async function DELETE({ params, request, locals }) {
	const scopeName = params.scope.slice(1);

	const body = (await request.json()) as CancelTransferRequestRequest;

	if (!body.requestId) error(400, 'expected requestId in the request body');

	const session = await locals.auth();

	if (!session) error(401);

	if (!(await isScopeOwner(session.user.id, scopeName))) {
		error(401, 'only the scope owner can cancel transfer requests');
	}

	await deleteTransferRequest(body.requestId);

	return json({});
}
