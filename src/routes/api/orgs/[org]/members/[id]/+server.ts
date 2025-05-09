import { db } from '$lib/backend/db';
import { getOrg } from '$lib/backend/db/functions.js';
import { error, json } from '@sveltejs/kit';
import * as tables from '$lib/backend/db/schema.js';
import { eq } from 'drizzle-orm';
import { stripeClient } from '$lib/ts/stripe/index.js';

export async function DELETE({ params, locals }) {
	const session = await locals.auth();

	if (!session) error(401);

	const memberId = parseInt(params.id);
	const orgName = params.org;

	const org = await getOrg({ name: orgName });

	if (!org) error(404);

	const owner = org.members.find((m) => m.userId === session.user.id && m.role === 'owner');

	if (!owner) error(401, 'only an owner can do this');

	const otherOwners = org.members.filter((m) => m.role === 'owner' && m.id !== memberId);

	if (otherOwners.length === 0) {
		error(400, 'you cannot remove yourself from an organization that has no other owners');
	}

	const checkBearer = org.members.find(
		(m) => m.user.stripeCustomerId === org.subscription?.stripeCustomerId
	);

	// removeMember
	const result = await db.transaction(async (tx) => {
		const result = await tx
			.delete(tables.orgMember)
			.where(eq(tables.orgMember.id, memberId))
			.returning();

		if (result.length === 0) {
			return tx.rollback();
		}

		const members = await tx
			.select()
			.from(tables.orgMember)
			.where(eq(tables.orgMember.orgId, org.id));

		const [subRes, orgRes] = await Promise.all([
			tx
				.update(tables.subscription)
				.set({ members: members.length })
				.where(eq(tables.subscription.referenceId, org.id))
				.returning(),
			tx
				.update(tables.org)
				.set({ memberCount: members.length })
				.where(eq(tables.org.id, org.id))
				.returning()
		]);

		if (subRes.length === 0 || orgRes.length === 0) {
			tx.rollback();
			return false;
		}

		// we need to cancel the subscription when deleting the user
		if (checkBearer && checkBearer.id === memberId) {
			// this should never happen
			if (typeof org.subscription?.stripeSubscriptionId !== 'string') {
				return tx.rollback();
			}

			try {
				await stripeClient.subscriptions.cancel(org.subscription.stripeSubscriptionId);
			} catch {
				return tx.rollback();
			}
		}

		return true;
	});

	if (!result) error(500, 'error removing org member');

	return json({});
}
