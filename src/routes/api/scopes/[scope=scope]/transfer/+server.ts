import { isSameScopeOwner } from '$lib/backend/db/client-functions.js';
import {
	acceptScopeTransferRequest,
	createScopeTransferRequest,
	dismissPendingScopeTransferRequests,
	getOrg,
	getScopeWithOwner,
	isScopeOwner,
	getUserOrOrg,
	type FullOrg,
	type TransferOwnershipOptions
} from '$lib/backend/db/functions.js';
import { db } from '$lib/backend/db/index.js';
import { posthog } from '$lib/ts/posthog.js';
import {
	resend,
	scopeTransferredEmail,
	scopeTransferRequestedEmail,
	scopeTransferRequestedEmailToOldOwner
} from '$lib/ts/resend.js';
import { error, json } from '@sveltejs/kit';
import { waitUntil } from '@vercel/functions';
import assert from 'assert';
import type { CreateEmailOptions } from 'resend';

export type TransferRequestRequest = {
	transferTo: string;
};

type TransferRequest = TransferOwnershipOptions & {
	createdById: string;
	acceptedAt: Date | undefined;
	oldUserId?: string | null;
	oldOrgId?: string | null;
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

	const userOrOrg = await getUserOrOrg(body.transferTo);

	if (userOrOrg === null) error(400, `\`${body.transferTo}\` is not an user or org`);

	let selfTransfer = false;
	let transferRequest: TransferRequest | null = null;

	const result = await db.transaction(async (tx) => {
		// dismiss pending transfer requests
		await dismissPendingScopeTransferRequests(tx, scope.id);

		if (userOrOrg.user !== null) {
			const user = userOrOrg.user;

			selfTransfer = user.id === session.user.id;

			const initialRequest = {
				scopeId: scope.id,
				newUserId: user.id,
				oldUserId: scope.userId,
				oldOrgId: scope.orgId,
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
				let oldOrg: FullOrg | null = null;

				const emails: CreateEmailOptions[] = [];

				emails.push(
					scopeTransferRequestedEmail({
						scopeName: scopeName,
						newOwner: user,
						oldOwner: session.user,
						newOwnerName: user.name
					})
				);

				// if we are transferring from an org we notify everyone
				if (scope.orgId !== null) {
					oldOrg = await getOrg({ id: scope.orgId });

					assert(oldOrg !== null, 'it must exist');

					for (const owner of oldOrg.members.filter((m) => m.role === 'owner')) {
						emails.push(
							scopeTransferRequestedEmailToOldOwner({
								scopeName: scopeName,
								oldOwner: owner.user,
								newOwnerName: user.name
							})
						);
					}
				}

				await Promise.all(emails.map((email) => resend.emails.send(email)));

				return 'requested';
			}
		} else {
			const newFullOrg = await getOrg({ name: body.transferTo });

			assert(newFullOrg !== null, 'we just got this');

			selfTransfer =
				newFullOrg.members.find((m) => m.userId === session.user.id && m.role === 'owner') !==
				undefined;

			const initialRequest = {
				scopeId: scope.id,
				newOrgId: newFullOrg.id,
				createdById: session.user.id,
				oldUserId: scope.userId,
				oldOrgId: scope.orgId,
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
				const owners = newFullOrg.members.filter((m) => m.role === 'owner');

				let oldOrg: FullOrg | null = null;

				const emails: CreateEmailOptions[] = [];

				for (const owner of owners) {
					emails.push(
						scopeTransferRequestedEmail({
							scopeName: scopeName,
							newOwner: owner.user,
							oldOwner: session.user,
							newOwnerName: newFullOrg.name
						})
					);
				}

				// if we are transferring from an org we notify everyone
				if (scope.orgId !== null) {
					oldOrg = await getOrg({ id: scope.orgId });

					assert(oldOrg !== null, 'it must exist');

					for (const owner of oldOrg.members.filter((m) => m.role === 'owner')) {
						emails.push(
							scopeTransferRequestedEmailToOldOwner({
								scopeName: scopeName,
								oldOwner: owner.user,
								newOwnerName: newFullOrg.name
							})
						);
					}
				}

				await Promise.all(emails.map((email) => resend.emails.send(email)));

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
				newOwnerName: userOrOrg.org !== null ? body.transferTo : 'you',
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
