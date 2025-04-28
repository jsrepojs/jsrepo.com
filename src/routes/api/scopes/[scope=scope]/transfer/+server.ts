import { isSameScopeOwner } from '$lib/backend/db/client-functions.js';
import {
	acceptScopeTransferRequest,
	createScopeTransferRequest,
	dismissPendingScopeTransferRequests,
	getOrgWithOwner,
	getScopeWithOwner,
	getUserByEmail,
	isScopeOwner,
	isUserOrOrg,
	type TransferOwnershipOptions
} from '$lib/backend/db/functions.js';
import { db } from '$lib/backend/db/index.js';
import { posthog } from '$lib/ts/posthog.js';
import {
	resend,
	scopeTransferredEmail,
	scopeTransferredRequestedEmail,
	scopeTransferredRequestedEmailToOldOwner
} from '$lib/ts/resend.js';
import { error, json } from '@sveltejs/kit';
import { waitUntil } from '@vercel/functions';
import assert from 'assert';

export type TransferRequestRequest = {
	transferTo: string;
};

type TransferRequest = TransferOwnershipOptions & {
	createdById: string;
	acceptedAt: Date | undefined;
	oldUserId?: string | null;
	oldOrgId?: number | null;
};

export type TransferRequestResponse =
	| {
			type: 'transferred';
	  }
	| ({
			type: 'requested';
	  } & TransferRequest);

export async function POST({ request, params, locals }) {
	const scopeName = params.scope.slice(1);

	const body = (await request.json()) as TransferRequestRequest;

	if (!body.transferTo) error(400, 'expected transferTo in the request body');

	const session = await locals.auth();

	if (!session) error(401);

	if (!(await isScopeOwner(session.user.id, scopeName))) {
		error(401, 'only the scope owner can transfer access');
	}

	const scope = await getScopeWithOwner(scopeName);

	assert(scope !== null, 'scope should be defined');

	if (isSameScopeOwner(body.transferTo, scope)) {
		error(400, 'cannot transfer to the same owner');
	}

	const userOrOrg = await isUserOrOrg(body.transferTo);

	if (userOrOrg === null) error(400, `\`${body.transferTo}\` is not an user or org`);

	let selfTransfer = false;
	let transferRequest: TransferRequest | null = null;

	const result = await db.transaction(async (tx) => {
		// dismiss pending transfer requests
		await dismissPendingScopeTransferRequests(tx, scope.scope.id);

		if (userOrOrg === 'user') {
			const user = await getUserByEmail(body.transferTo);

			assert(user !== null, 'we just got this');

			selfTransfer = user.id === session.user.id;

			const initialRequest = {
				scopeId: scope.scope.id,
				newUserId: user.id,
				oldUserId: scope.scope.userId,
				oldOrgId: scope.scope.orgId,
				createdById: session.user.id,
				// if we are transferring to ourself auto accept
				acceptedAt: selfTransfer ? new Date() : undefined
			};

			const requestId = await createScopeTransferRequest(tx, initialRequest);

			if (!requestId) {
				tx.rollback();
				return;
			}

			transferRequest = { id: requestId, ...initialRequest };

			if (!selfTransfer) {
				await Promise.all([
					resend.emails.send(
						scopeTransferredRequestedEmailToOldOwner({
							scopeName: scopeName,
							newOwner: user,
							oldOwner: session.user,
							newOwnerName: user.name
						})
					),
					resend.emails.send(
						scopeTransferredRequestedEmail({
							scopeName: scopeName,
							newOwner: user,
							oldOwner: session.user,
							newOwnerName: 'you'
						})
					)
				]);

				return 'requested';
			}
		} else {
			const orgAndOwner = await getOrgWithOwner(body.transferTo);

			assert(orgAndOwner !== null, 'we just got this');

			selfTransfer = orgAndOwner.user.id === session.user.id;

			const initialRequest = {
				scopeId: scope.scope.id,
				newOrgId: orgAndOwner.org.id,
				createdById: session.user.id,
				oldUserId: scope.scope.userId,
				oldOrgId: scope.scope.orgId,
				// if we are transferring to ourself auto accept
				acceptedAt: selfTransfer ? new Date() : undefined
			};

			const requestId = await createScopeTransferRequest(tx, initialRequest);

			if (!requestId) {
				tx.rollback();
				return;
			}

			transferRequest = { id: requestId, ...initialRequest };

			if (!selfTransfer) {
				await Promise.all([
					resend.emails.send(
						scopeTransferredRequestedEmailToOldOwner({
							scopeName: scopeName,
							newOwner: orgAndOwner.user,
							oldOwner: session.user,
							newOwnerName: orgAndOwner.org.name
						})
					),
					resend.emails.send(
						scopeTransferredRequestedEmail({
							scopeName: scopeName,
							newOwner: orgAndOwner.user,
							oldOwner: session.user,
							newOwnerName: orgAndOwner.org.name
						})
					)
				]);

				return 'requested';
			}
		}

		// if we are transferring to ourself just transfer
		const transferRes = await acceptScopeTransferRequest(tx, transferRequest);

		if (!transferRes) {
			error(500, 'error accepting the transfer request');
		}

		await resend.emails.send(
			scopeTransferredEmail({
				newOwner: session.user,
				newOwnerName: userOrOrg === 'org' ? body.transferTo : 'you',
				scopeName
			})
		);

		return 'transferred';
	});

	posthog.capture({
		event: result === 'transferred' ? 'scope-transferred' : 'scope-transfer-requested',
		distinctId: session.user.id,
		properties: {
			scope: scopeName
		}
	});

	waitUntil(posthog.shutdown());

	if (result === 'transferred') {
		return json({ type: result } satisfies TransferRequestResponse);
	} else {
		assert(transferRequest !== null, '');

		// @ts-expect-error shut up
		return json({ type: result, ...transferRequest } satisfies TransferRequestResponse);
	}
}
