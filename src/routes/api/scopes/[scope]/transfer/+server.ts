import { auth } from '$lib/auth';
import {
	createScopeTransferRequest,
	getOrgWithOwner,
	getScope,
	getUserByEmail,
	isScopeOwner,
	isUserOrOrg,
	transferScopeOwnership,
	type TransferOwnershipOptions
} from '$lib/backend/db/functions.js';
import { db } from '$lib/backend/db/index.js';
import {
	resend,
	scopeTransferredEmail,
	scopeTransferredRequestedEmail,
	scopeTransferredRequestedEmailToOldOwner
} from '$lib/ts/resend.js';
import { error, json } from '@sveltejs/kit';
import assert from 'assert';

export type TransferRequestRequest = {
	transferTo: string;
};

export type TransferRequestResponse = {
	type: 'transferred' | 'requested';
};

export async function PATCH({ request, params }) {
	if (!params.scope.startsWith('@')) {
		error(400, `invalid scope '${params.scope}' scopes must start with '@'`);
	}

	const scopeName = params.scope.slice(1);

	const body = (await request.json()) as TransferRequestRequest;

	if (!body.transferTo) error(400, 'expected transferTo in the request body');

	const session = await auth.api.getSession({ headers: request.headers });

	if (!session) error(401);

	if (!(await isScopeOwner(session.user.id, scopeName))) {
		error(401, 'only the scope owner can transfer access');
	}

	const scope = await getScope(scopeName);

	assert(scope !== null, 'scope should be defined');

	const userOrOrg = await isUserOrOrg(body.transferTo);

	if (userOrOrg === null) error(400, `\`${body.transferTo}\` is not an user or org`);

	let selfTransfer = false;

	const result = await db.transaction(async (tx) => {
		let transferRequest: TransferOwnershipOptions & {
			createdById: string;
			acceptedAt: Date | undefined;
		};

		if (userOrOrg === 'user') {
			const user = await getUserByEmail(body.transferTo);

			assert(user !== null, 'we just got this');

			selfTransfer = user.id === session.user.id;

			transferRequest = {
				scopeId: scope.id,
				newUserId: user.id,
				oldUserId: scope.userId,
				oldOrgId: scope.orgId,
				createdById: session.user.id,
				// if we are transferring to ourself auto accept
				acceptedAt: selfTransfer ? new Date() : undefined
			};

			await createScopeTransferRequest(tx, transferRequest);

			if (!selfTransfer) {
				await Promise.all([
					resend.emails.send(
						scopeTransferredRequestedEmail({
							scopeName: scopeName,
							newOwner: user,
							oldOwner: session.user
						})
					),
					resend.emails.send(
						scopeTransferredRequestedEmailToOldOwner({
							scopeName: scopeName,
							newOwner: user,
							oldOwner: session.user
						})
					)
				]);

				return 'requested';
			}
		} else {
			const orgAndOwner = await getOrgWithOwner(body.transferTo);

			assert(orgAndOwner !== null, 'we just got this');

			selfTransfer = orgAndOwner.user.id === session.user.id;

			transferRequest = {
				scopeId: scope.id,
				newOrgId: orgAndOwner.org.id,
				createdById: session.user.id,
				oldUserId: scope.userId,
				oldOrgId: scope.orgId,
				// if we are transferring to ourself auto accept
				acceptedAt: selfTransfer ? new Date() : undefined
			};

			await createScopeTransferRequest(tx, transferRequest);

			if (!selfTransfer) {
				await Promise.all([
					resend.emails.send(
						scopeTransferredRequestedEmail({
							scopeName: scopeName,
							newOwner: orgAndOwner.user,
							oldOwner: session.user,
							newOrg: orgAndOwner.org.name
						})
					),
					resend.emails.send(
						scopeTransferredRequestedEmailToOldOwner({
							scopeName: scopeName,
							newOwner: orgAndOwner.user,
							oldOwner: session.user,
							newOrg: orgAndOwner.org.name
						})
					)
				]);

				return 'requested';
			}
		}

		// if we are transferring to ourself just transfer
		await transferScopeOwnership(tx, transferRequest);

		await resend.emails.send(
			scopeTransferredEmail({
				newOwner: session.user,
				newOrg: userOrOrg === 'org' ? body.transferTo : undefined,
				scopeName
			})
		);

		return 'transferred';
	});

	return json({ type: result } satisfies TransferRequestResponse);
}
