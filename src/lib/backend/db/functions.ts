import {
	aliasedTable,
	and,
	eq,
	gt,
	ilike,
	inArray,
	isNotNull,
	isNull,
	or,
	desc,
	type TablesRelationalConfig,
	type InferInsertModel,
	getTableColumns,
	sql,
	sum,
	gte,
	SQL,
	countDistinct,
	not
} from 'drizzle-orm';
import { db } from '.';
import * as tables from './schema';
import type { PgColumn, PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import semver from 'semver';
import { checkUserSubscription, PRO_PRODUCT_ID, TEAM_PRODUCT_ID } from '$lib/ts/polar/client';
import * as v from 'valibot';
import { polar } from '$lib/ts/polar';
import type { Customer } from '@polar-sh/sdk/models/components/customer.js';
import { postHogClient } from '$lib/ts/posthog';
import { DAY } from '$lib/ts/time';

export type tx = PgTransaction<
	PostgresJsQueryResultHKT,
	Record<string, never>,
	TablesRelationalConfig
>;

export async function canPublishToScope(
	user: tables.User,
	scope: tables.Scope,
	privateRegistry: boolean
): Promise<boolean> {
	if (scope.userId === user.id) {
		if (!privateRegistry) return true;

		// any paid plan is fine
		if (checkUserSubscription(user) !== null) return true;

		return false;
	}

	// scope is owned by a user but not you, sorry
	if (scope.orgId === null) return false;

	const significantMembers = await db
		.select({
			id: tables.user.id,
			ownerId: tables.org.ownerId,
			polarSubscriptionPlanId: tables.user.polarSubscriptionPlanId,
			polarSubscriptionPlanEnd: tables.user.polarSubscriptionPlanEnd,
			role: tables.orgMember.role
		})
		.from(tables.org)
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.innerJoin(
			tables.user,
			or(eq(tables.user.id, tables.org.ownerId), eq(tables.user.id, tables.orgMember.userId))
		)
		.where(
			and(
				eq(tables.org.id, scope.orgId),
				or(eq(tables.user.id, user.id), eq(tables.user.id, tables.org.ownerId))
			)
		);

	const orgUser = significantMembers.find((m) => m.id === user.id);

	// not a part of the org or doesn't have publish access
	if (!orgUser) return false;

	// if we aren't the owner and we can't publish on our own
	if (orgUser.role !== null && !canPublish(orgUser.role)) return false;

	const owner = significantMembers.find((m) => m.id === m.ownerId)!;

	if (checkUserSubscription(owner) !== 'Team') return false;

	return true;
}

export function canPublish(role: tables.OrgRole) {
	if (role === 'member') return false;

	if (role === 'publisher') return true;

	if (role === 'collaborator') return true;

	return false;
}

export async function getScope(scope: string): Promise<tables.Scope | null> {
	const scopes = await db.select().from(tables.scope).where(eq(tables.scope.name, scope));

	return scopes[0] ?? null;
}

export async function getUser(userId: string): Promise<tables.User | null> {
	const user = await db.select().from(tables.user).where(eq(tables.user.id, userId));

	return user[0] ?? null;
}

export async function createCustomer(user: tables.User) {
	// this will recover the customer id in case it somehow gets lost
	let customer: Customer | null = null;

	const pages = await polar.customers.list({ email: user.email });

	for await (const page of pages) {
		for (const c of page.result.items) {
			if (c.email === user.email) {
				customer = c;
				break;
			}
		}
	}

	if (customer === null) {
		customer = await polar.customers.create({
			externalId: user.id,
			name: user.name,
			email: user.email
		});
	}

	const result = await db
		.update(tables.user)
		.set({ polarCustomerId: customer.id })
		.where(eq(tables.user.id, user.id))
		.returning();

	if (result.length === 0) return null;

	return result[0];
}

export async function createScope(record: {
	name: string;
	orgId?: number | null;
	userId?: string | null;
}): Promise<number | null> {
	const result = await db.insert(tables.scope).values(record).returning({ id: tables.scope.id });

	return result[0]?.id ?? null;
}

export async function getRegistry(
	scopeName: string,
	registryName: string,
	userId: string | null
): Promise<tables.Registry | null> {
	const owner = aliasedTable(tables.user, 'owner');

	const registries = await db
		.select({
			...getTableColumns(tables.registry)
		})
		.from(tables.scope)
		.innerJoin(tables.registry, eq(tables.scope.id, tables.registry.scopeId))
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(owner, eq(owner.id, tables.org.ownerId))
		.where(
			and(
				eq(tables.scope.name, scopeName),
				eq(tables.registry.name, registryName),

				checkAccessQuery(userId, owner)
			)
		);

	if (registries.length === 0) return null;

	return registries[0];
}

export async function getVersions(
	scopeName: string,
	registryName: string
): Promise<tables.Version[] | null> {
	const versions = await db
		.select({
			id: tables.version.id,
			version: tables.version.version,
			tag: tables.version.tag,
			registryId: tables.version.registryId,
			releasedById: tables.version.releasedById,
			hasReadme: tables.version.hasReadme,
			createdAt: tables.version.createdAt
		})
		.from(tables.scope)
		.innerJoin(tables.registry, eq(tables.scope.id, tables.registry.scopeId))
		.innerJoin(tables.version, eq(tables.registry.id, tables.version.registryId))
		.where(and(eq(tables.scope.name, scopeName), eq(tables.registry.name, registryName)))
		.orderBy(desc(tables.version.createdAt));

	if (versions.length === 0) return null;

	return versions;
}

export async function getVersion(scopeName: string, registryName: string, version: string) {
	const isTag = !semver.valid(version);

	const result = await db
		.select()
		.from(tables.version)
		.innerJoin(tables.registry, eq(tables.registry.id, tables.version.registryId))
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.innerJoin(tables.user, eq(tables.user.id, tables.version.releasedById))
		.where(
			and(
				eq(tables.scope.name, scopeName),
				eq(tables.registry.name, registryName),
				eq(isTag ? tables.version.tag : tables.version.version, version)
			)
		);

	if (result.length === 0) return null;

	return result[0];
}

export async function createRegistry(
	tx: tx,
	record: InferInsertModel<typeof tables.registry>
): Promise<number | null> {
	const result = await tx
		.insert(tables.registry)
		.values(record)
		.returning({ id: tables.registry.id });

	if (result.length === 0) return null;

	return result[0].id;
}

export async function createVersion(
	tx: PgTransaction<PostgresJsQueryResultHKT, Record<string, never>, TablesRelationalConfig>,
	record: {
		registryId: number;
		version: string;
		tag: string | null;
		releasedById: string;
		hasReadme: boolean;
	},
	oldTaggedVersionId?: number
): Promise<number | null> {
	if (record.tag && oldTaggedVersionId) {
		// remove the tag from the old version
		await tx
			.update(tables.version)
			.set({ tag: null })
			.where(eq(tables.version.id, oldTaggedVersionId));
	}

	const result = await tx
		.insert(tables.version)
		.values(record)
		.returning({ id: tables.version.id });

	if (result.length === 0) return null;

	return result[0].id;
}

export async function getApiKey(userId: string, name: string): Promise<tables.APIKey | null> {
	const apiKeys = await db
		.select()
		.from(tables.apikey)
		.where(and(eq(tables.apikey.name, name), eq(tables.apikey.userId, userId)));

	if (apiKeys.length === 0) return null;

	return apiKeys[0];
}

export async function createFiles(
	tx: PgTransaction<PostgresJsQueryResultHKT, Record<string, never>, TablesRelationalConfig>,
	versionId: number,
	records: { name: string; content: string }[]
): Promise<number[] | null> {
	const result = await tx
		.insert(tables.file)
		.values(records.map((v) => ({ ...v, versionId })))
		.returning({ id: tables.file.id });

	if (result.length !== records.length) {
		return null;
	}

	return result.map((v) => v.id);
}

export async function getFileContents(
	userId: string | null,
	scopeName: string,
	registryName: string,
	version: string,
	fileName: string
): Promise<string | null> {
	const isTag = !semver.valid(version);

	const owner = aliasedTable(tables.user, 'owner');

	const result = await db
		.select({ content: tables.file.content })
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.innerJoin(tables.registry, eq(tables.scope.id, tables.registry.scopeId))
		.innerJoin(tables.version, eq(tables.registry.id, tables.version.registryId))
		.innerJoin(tables.file, eq(tables.version.id, tables.file.versionId))
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(owner, eq(owner.id, tables.org.ownerId))
		.where(
			and(
				eq(tables.scope.name, scopeName),
				eq(tables.registry.name, registryName),
				eq(isTag ? tables.version.tag : tables.version.version, version),
				eq(tables.file.name, fileName),

				checkAccessQuery(userId, owner)
			)
		);

	if (result.length === 0) return null;

	return result[0].content;
}

export async function getFiles(
	userId: string | null,
	scopeName: string,
	registryName: string,
	version: string,
	filesNames: string[]
): Promise<tables.File[]> {
	const isTag = !semver.valid(version);

	const owner = aliasedTable(tables.user, 'owner');

	const result = await db
		.select({
			id: tables.file.id,
			name: tables.file.name,
			content: tables.file.content,
			versionId: tables.file.versionId,
			createdAt: tables.file.createdAt
		})
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.innerJoin(tables.registry, eq(tables.scope.id, tables.registry.scopeId))
		.innerJoin(tables.version, eq(tables.registry.id, tables.version.registryId))
		.innerJoin(tables.file, eq(tables.version.id, tables.file.versionId))
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(owner, eq(owner.id, tables.org.ownerId))
		.where(
			and(
				eq(tables.scope.name, scopeName),
				eq(tables.registry.name, registryName),
				eq(isTag ? tables.version.tag : tables.version.version, version),
				inArray(tables.file.name, filesNames),

				checkAccessQuery(userId, owner)
			)
		);

	return result;
}

export async function listApiKeys(userId: string) {
	const keys = await db
		.select({
			id: tables.apikey.id,
			name: tables.apikey.name,
			expiresAt: tables.apikey.expiresAt,
			createdAt: tables.apikey.createdAt
		})
		.from(tables.apikey)
		.where(eq(tables.apikey.userId, userId))
		.orderBy(tables.apikey.createdAt);

	return keys ?? [];
}

export async function listMyScopes(userId: string) {
	const [userScopes, orgScopes] = await Promise.all([
		db.select().from(tables.scope).where(eq(tables.scope.userId, userId)),
		db
			.select({
				...getTableColumns(tables.scope)
			})
			.from(tables.org)
			.leftJoin(tables.orgMember, eq(tables.org.id, tables.orgMember.orgId))
			.innerJoin(tables.scope, eq(tables.org.id, tables.scope.orgId))
			.where(or(eq(tables.org.ownerId, userId), eq(tables.orgMember.userId, userId)))
	]);

	return {
		userScopes,
		orgScopes
	};
}

export async function revokeSubscription(userId: string, productId: string) {
	await db
		.update(tables.user)
		.set({ polarSubscriptionPlanId: null, polarSubscriptionPlanEnd: null })
		// we check to make sure the plan we are canceling is active
		// to handle cases where webhooks may come out of order
		.where(and(eq(tables.user.id, userId), eq(tables.user.polarSubscriptionPlanId, productId)));
}

export async function listMyOrganizations(userId: string) {
	const result = await db
		.selectDistinctOn([tables.org.id])
		.from(tables.org)
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.where(or(eq(tables.org.ownerId, userId), eq(tables.orgMember.userId, userId)));

	return result;
}

/** Gets the registries belonging to the scope regardless of the subscription status
 *
 * @param userId
 * @param scopeName
 */
export async function getScopeRegistries(userId: string | null, scopeName: string) {
	const owner = aliasedTable(tables.user, 'owner');

	const result = await db
		.select({
			id: tables.registry.id,
			name: tables.registry.name,
			private: tables.registry.private,
			scopeId: tables.registry.scopeId,
			createdAt: tables.registry.createdAt
		})
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.innerJoin(tables.registry, eq(tables.scope.id, tables.registry.scopeId))
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(owner, eq(owner.id, tables.org.ownerId))
		.where(
			and(
				eq(tables.scope.name, scopeName),

				// access check
				checkAccessQuery(userId, owner, false)
			)
		);

	return result;
}

export async function nameIsBanned(name: string) {
	const banned = await db
		.select({ id: tables.commonNameBan.id })
		.from(tables.commonNameBan)
		.where(ilike(tables.commonNameBan.name, name));

	return banned.length > 0;
}

/** Checks if the user has access to the registry
 *
 * You will need to join tables.scope, tables.user, tables.registry and have an aliased table of tables.user for the owner */
function checkAccessQuery(
	userId: string | null,
	owner: typeof tables.user,
	checkSubscription = true
) {
	return or(
		// registry is not private
		eq(tables.registry.private, false),

		// registry is private but they have access and have paid their subscription
		or(
			// Pro
			and(
				isNotNull(tables.scope.userId),

				// check if we own the scope
				eq(tables.scope.userId, userId ?? ''),

				// check the status of the users subscription plan
				checkSubscription
					? and(
							inArray(tables.user.polarSubscriptionPlanId, [PRO_PRODUCT_ID, TEAM_PRODUCT_ID]),
							or(
								isNull(tables.user.polarSubscriptionPlanEnd),
								gt(tables.user.polarSubscriptionPlanEnd, new Date())
							)
						)
					: undefined
			),

			// Team
			and(
				isNotNull(tables.scope.orgId),

				// check if we are part of the organization
				or(eq(tables.org.ownerId, userId ?? ''), eq(tables.orgMember.userId, userId ?? '')),

				// check the status of the owners subscription plan
				checkSubscription
					? and(
							isNotNull(owner.id),
							eq(owner.polarSubscriptionPlanId, TEAM_PRODUCT_ID),
							or(
								isNull(owner.polarSubscriptionPlanEnd),
								gt(owner.polarSubscriptionPlanEnd, new Date())
							)
						)
					: undefined
			)
		)
	);
}

export async function getOrg(name: string) {
	const result = await db.select().from(tables.org).where(eq(tables.org.name, name));

	if (result.length === 0) return null;

	return result[0];
}

export type CompleteOrg = tables.Org & {
	members: (tables.User & { orgRole: tables.OrgRole | null })[];
	owner: tables.User;
};

export async function getOrgWithMembers(orgName: string): Promise<CompleteOrg | null> {
	const tableOwner = aliasedTable(tables.user, 'owner');

	const result = await db
		.select({
			...getTableColumns(tables.org),
			member: tables.user,
			orgRole: tables.orgMember.role,
			owner: getTableColumns(tableOwner)
		})
		.from(tables.org)
		.leftJoin(tableOwner, eq(tableOwner.id, tables.org.ownerId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.leftJoin(tables.user, eq(tables.user.id, tables.orgMember.userId))
		.where(eq(tables.org.name, orgName));

	if (result.length === 0) return null;

	const members: CompleteOrg['members'] = [];

	const owner = result[0].owner;

	if (owner === null) return null;

	members.push({ ...owner, orgRole: null });

	for (const row of result) {
		if (row.member !== null) {
			members.push({ ...row.member, orgRole: row.orgRole });
		}
	}

	return { ...result[0], owner, members } satisfies CompleteOrg;
}

export async function getUserByEmail(email: string) {
	const result = await db.select().from(tables.user).where(eq(tables.user.email, email));

	if (result.length === 0) return null;

	return result[0];
}

export async function isScopeOwner(userId: string, scopeName: string): Promise<boolean> {
	const result = await db
		.select()
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(
			tables.user,
			or(eq(tables.user.id, tables.scope.userId), eq(tables.user.id, tables.org.ownerId))
		)
		.where(and(eq(tables.scope.name, scopeName), eq(tables.user.id, userId)));

	return result.length > 0;
}

export async function createScopeTransferRequest(
	tx: tx,
	record: InferInsertModel<typeof tables.scopeTransferRequest>
) {
	const result = await tx
		.insert(tables.scopeTransferRequest)
		.values(record)
		.returning({ id: tables.scopeTransferRequest.id });

	if (result.length === 0) return null;

	return result[0]?.id;
}

export async function isUserOrOrg(search: string): Promise<'user' | 'org' | null> {
	const result = v.safeParse(v.pipe(v.string(), v.email()), search);

	if (result.success) {
		// is email
		const user = await getUserByEmail(search);

		if (user === null) return null;

		return 'user';
	} else {
		const org = await getOrg(search);

		if (org === null) return null;

		return 'org';
	}
}

export async function getOrgWithOwner(name: string) {
	const result = await db
		.select()
		.from(tables.org)
		.innerJoin(tables.user, eq(tables.user.id, tables.org.ownerId))
		.where(eq(tables.org.name, name));

	if (result.length === 0) return null;

	return result[0];
}

export async function getScopeWithOwner(name: string) {
	const result = await db
		.select()
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.innerJoin(
			tables.user,
			or(eq(tables.user.id, tables.scope.userId), eq(tables.user.id, tables.org.ownerId))
		)
		.where(eq(tables.scope.name, name));

	if (result.length === 0) return null;

	return result[0];
}

/** You have scope access if 1 you are the owner or 2 you are a member of a team which is maintaining an active subscription.
 *
 * @param name
 */
export async function hasScopeAccess(userId: string | null, name: string) {
	const owner = aliasedTable(tables.user, 'owner');

	const result = await db
		.select({
			id: tables.scope.id
		})
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(owner, eq(owner.id, tables.org.ownerId))
		.where(
			and(
				eq(tables.scope.name, name),

				// access check
				or(
					// Free / Pro
					and(
						isNotNull(tables.scope.userId),

						eq(tables.scope.userId, userId ?? '')
					),

					// Team
					and(
						isNotNull(tables.scope.orgId),

						// either we are the owner or we are a member of the team with the subscription active
						or(
							// we are the owner
							eq(tables.org.ownerId, userId ?? ''),

							// we are a member and subscription is paid
							and(
								eq(tables.orgMember.userId, userId ?? ''),

								isNotNull(owner.id),
								eq(owner.polarSubscriptionPlanId, TEAM_PRODUCT_ID),
								or(
									isNull(owner.polarSubscriptionPlanEnd),
									gt(owner.polarSubscriptionPlanEnd, new Date())
								)
							)
						)
					)
				)
			)
		);

	return result[0] !== undefined;
}

export async function dismissPendingScopeTransferRequests(tx: tx, scopeId: number) {
	await tx.delete(tables.scopeTransferRequest).where(
		and(
			eq(tables.scopeTransferRequest.scopeId, scopeId),

			// don't delete any that have been interacted with
			and(
				isNull(tables.scopeTransferRequest.acceptedAt),
				isNull(tables.scopeTransferRequest.rejectedAt)
			)
		)
	);
}

export async function getActiveTransferRequest(name: string) {
	const toUser = aliasedTable(tables.user, 'to_user');
	const toOrg = aliasedTable(tables.org, 'to_org');

	const result = await db
		.select({
			scopeTransferRequest: getTableColumns(tables.scopeTransferRequest),
			toUser: getTableColumns(toUser),
			toOrg: getTableColumns(toOrg)
		})
		.from(tables.scopeTransferRequest)
		.innerJoin(tables.scope, eq(tables.scope.id, tables.scopeTransferRequest.scopeId))
		.leftJoin(toUser, eq(toUser.id, tables.scopeTransferRequest.newUserId))
		.leftJoin(toOrg, eq(toOrg.id, tables.scopeTransferRequest.newOrgId))
		.where(
			and(
				eq(tables.scope.name, name),

				// only select those that are null
				and(
					isNull(tables.scopeTransferRequest.acceptedAt),
					isNull(tables.scopeTransferRequest.rejectedAt)
				)
			)
		);

	if (result.length === 0) return null;

	return result[0];
}

export async function deleteTransferRequest(id: number) {
	await db.delete(tables.scopeTransferRequest).where(eq(tables.scopeTransferRequest.id, id));
}

export async function getTransferRequestInbox(userId: string) {
	const result = await db
		.select()
		.from(tables.scopeTransferRequest)
		.innerJoin(tables.scope, eq(tables.scope.id, tables.scopeTransferRequest.scopeId))
		.leftJoin(tables.org, eq(tables.org.id, tables.scopeTransferRequest.newOrgId))
		.innerJoin(
			tables.user,
			or(
				eq(tables.user.id, tables.org.ownerId),
				eq(tables.user.id, tables.scopeTransferRequest.newUserId)
			)
		)
		.where(
			and(
				eq(tables.user.id, userId),

				// only the ones we haven't replied to
				and(
					isNull(tables.scopeTransferRequest.acceptedAt),
					isNull(tables.scopeTransferRequest.rejectedAt)
				)
			)
		);

	return result;
}

export async function getScopeTransferRequest(id: number) {
	const result = await db
		.select()
		.from(tables.scopeTransferRequest)
		.innerJoin(tables.scope, eq(tables.scope.id, tables.scopeTransferRequest.scopeId))
		.leftJoin(tables.org, eq(tables.org.id, tables.scopeTransferRequest.newOrgId))
		.innerJoin(
			tables.user,
			or(
				eq(tables.user.id, tables.org.ownerId),
				eq(tables.user.id, tables.scopeTransferRequest.newUserId)
			)
		)
		.where(
			and(
				eq(tables.scopeTransferRequest.id, id),

				// only the ones we haven't replied to
				and(
					isNull(tables.scopeTransferRequest.acceptedAt),
					isNull(tables.scopeTransferRequest.rejectedAt)
				)
			)
		);

	if (result.length === 0) return null;

	return result[0];
}

export async function rejectScopeTransferRequest(id: number) {
	await db
		.update(tables.scopeTransferRequest)
		.set({ rejectedAt: new Date() })
		.where(eq(tables.scopeTransferRequest.id, id));
}

export type TransferOwnershipOptions = {
	id: number;
	scopeId: number;
	newOrgId?: number | null;
	newUserId?: string | null;
};

export async function acceptScopeTransferRequest(tx: tx, request: TransferOwnershipOptions) {
	const res = await tx
		.update(tables.scopeTransferRequest)
		.set({ acceptedAt: new Date() })
		.where(eq(tables.scopeTransferRequest.id, request.id))
		.returning();

	if (res.length === 0) {
		tx.rollback();
	}

	let scopeRes: tables.Scope[];
	if (request.newUserId) {
		scopeRes = await tx
			.update(tables.scope)
			.set({ orgId: null, userId: request.newUserId, claimedAt: new Date() })
			.where(eq(tables.scope.id, request.scopeId))
			.returning();
	} else {
		if (request.newOrgId === undefined) {
			tx.rollback();
		}

		scopeRes = await tx
			.update(tables.scope)
			.set({ orgId: request.newOrgId, userId: null, claimedAt: new Date() })
			.where(eq(tables.scope.id, request.scopeId))
			.returning();
	}

	if (scopeRes.length === 0) {
		tx.rollback();
	}

	return true;
}

export async function createOrg(
	record: InferInsertModel<typeof tables.org>
): Promise<tables.Org | null> {
	const result = await db.insert(tables.org).values(record).returning();

	if (result.length === 0) return null;

	return result[0];
}

export async function createOrgInvite(record: InferInsertModel<typeof tables.orgInvite>) {
	const result = await db.insert(tables.orgInvite).values(record).returning();

	if (result.length === 0) return null;

	return result[0];
}

export async function getOrgInvitesForEmail(email: string, orgId: number | null = null) {
	const result = await db
		.select({
			...getTableColumns(tables.orgInvite),
			org: tables.org
		})
		.from(tables.orgInvite)
		.innerJoin(tables.org, eq(tables.org.id, tables.orgInvite.orgId))
		.where(
			and(
				eq(tables.orgInvite.email, email),

				// hasn't interacted
				and(isNull(tables.orgInvite.rejectedAt), isNull(tables.orgInvite.acceptedAt)),

				orgId ? eq(tables.orgInvite.orgId, orgId) : undefined
			)
		);

	return result;
}

export async function getPendingOrgInvites(orgName: string, userId: string | null) {
	if (userId === null) return [];

	const member = aliasedTable(tables.user, 'member');

	const result = await db
		.select({
			...getTableColumns(tables.orgInvite),
			invitedUser: tables.user
		})
		.from(tables.orgInvite)
		.innerJoin(tables.org, eq(tables.org.id, tables.orgInvite.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		// restrict access to only those who are part of the org
		.innerJoin(
			member,
			or(eq(member.id, tables.orgMember.userId), eq(member.id, tables.org.ownerId))
		)
		.innerJoin(tables.user, eq(tables.user.email, tables.orgInvite.email))
		.where(
			and(
				// hasn't interacted
				and(isNull(tables.orgInvite.rejectedAt), isNull(tables.orgInvite.acceptedAt)),

				eq(tables.org.name, orgName)
			)
		);

	return result;
}

export async function getOrgInvite(id: number) {
	const result = await db
		.select()
		.from(tables.orgInvite)
		.where(
			and(
				eq(tables.orgInvite.id, id),

				// hasn't interacted
				and(isNull(tables.orgInvite.rejectedAt), isNull(tables.orgInvite.acceptedAt))
			)
		);

	if (result.length === 0) return null;

	return result[0];
}

export async function deleteOrgInvite(id: number) {
	const result = await db
		.delete(tables.orgInvite)
		.where(
			and(
				eq(tables.orgInvite.id, id),

				// hasn't interacted
				and(isNull(tables.orgInvite.rejectedAt), isNull(tables.orgInvite.acceptedAt))
			)
		)
		.returning({ id: tables.orgInvite.id });

	if (result.length === 0) return null;

	return result[0].id;
}

export async function acceptOrgInvite(inviteId: number, userId: string) {
	const result = await db.transaction(async (tx) => {
		// change status to accepted
		const invUpdate = await tx
			.update(tables.orgInvite)
			.set({ acceptedAt: new Date() })
			.where(eq(tables.orgInvite.id, inviteId))
			.returning();

		if (invUpdate.length === 0) return false;

		const invitation = invUpdate[0];

		// move user to org
		const res = await tx
			.insert(tables.orgMember)
			.values({ orgId: invitation.orgId, role: invitation.role, userId: userId })
			.returning();

		if (res.length === 0) {
			tx.rollback();
			return false;
		}

		return true;
	});

	return result;
}

export async function rejectOrgInvite(inviteId: number) {
	const result = await db
		.update(tables.orgInvite)
		.set({ rejectedAt: new Date() })
		.where(eq(tables.orgInvite.id, inviteId))
		.returning();

	if (result.length === 0) return false;

	return true;
}

export type RegistrySearchOptions = {
	q: string | null;
	org: string | null;
	scope: string | null;
	/** So users can see private registries they have access to */
	userId: string | null;
	offset: number | null;
	limit: number | null;
	orderBy: PgColumn | SQL | undefined;
};

export type RegistryDetails = tables.Registry & {
	scope: tables.Scope;
	org: tables.Org | null;
	latestVersion: tables.Version | null;
	monthlyFetches: number;
};

export async function searchRegistries({
	q,
	org,
	scope,
	limit,
	offset,
	userId,
	orderBy
}: Partial<RegistrySearchOptions>): Promise<{ total: number; data: RegistryDetails[] }> {
	const thirtyDaysAgo = new Date(Date.now() - DAY * 30).toISOString().slice(0, 10);

	const owner = aliasedTable(tables.user, 'owner');

	// --- Build the WHERE clause once ---
	const whereClause = and(
		q
			? q.startsWith('@')
				? ilike(sql`'@' || ${tables.scope.name} || '/' || ${tables.registry.name}`, `${q}%`)
				: or(
						ilike(
							sql`${tables.scope.name} || '/' || ${tables.registry.name}`,
							`%${q.replace(/^@/, '')}%`
						),
						ilike(tables.registry.metaDescription, `%${q}%`),
						sql`EXISTS (
				SELECT 1 FROM unnest(${tables.registry.metaTags}) AS tag
				WHERE tag ILIKE ${'%' + q + '%'}
			  )`
					)
			: undefined,
		org ? eq(tables.org.name, org) : undefined,
		scope ? eq(tables.scope.name, scope) : undefined,
		checkAccessQuery(userId ?? null, owner, true)
	);

	// --- Data query (with limit/offset) ---
	let dataQuery = db
		.select({
			...getTableColumns(tables.registry),
			scope: tables.scope,
			org: tables.org,
			latestVersion: tables.version,
			monthlyFetches: sum(tables.dailyRegistryFetch.count)
		})
		.from(tables.registry)
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.leftJoin(
			tables.version,
			and(eq(tables.version.registryId, tables.registry.id), eq(tables.version.tag, 'latest'))
		)
		.leftJoin(
			tables.dailyRegistryFetch,
			and(
				eq(tables.dailyRegistryFetch.registryId, tables.registry.id),
				eq(tables.dailyRegistryFetch.fileName, 'jsrepo-manifest.json'),
				gte(tables.dailyRegistryFetch.day, thirtyDaysAgo)
			)
		)
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(owner, eq(owner.id, tables.org.ownerId))
		.where(whereClause)
		.groupBy(
			tables.registry.id,
			tables.registry.name,
			tables.registry.scopeId,
			tables.registry.createdAt,
			tables.scope.id,
			tables.scope.name,
			tables.scope.orgId,
			tables.org.id,
			tables.org.name,
			tables.org.ownerId,
			tables.version.id,
			tables.version.registryId,
			tables.version.tag,
			tables.version.createdAt
		);

	if (orderBy !== undefined) {
		// @ts-expect-error idk what's wrong with you
		dataQuery = dataQuery.orderBy(orderBy);
	}

	// @ts-expect-error idk what's wrong with you
	dataQuery = dataQuery.offset(offset ?? 0);

	if (limit !== undefined) {
		// @ts-expect-error idk what's wrong with you
		dataQuery = dataQuery.limit(limit);
	}

	// --- Count query (no limit/offset, just count) ---
	const countQuery = db
		.select({ total: countDistinct(tables.registry.id) })
		.from(tables.registry)
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(owner, eq(owner.id, tables.org.ownerId))
		.where(whereClause);

	// --- Run both queries in parallel ---
	const [data, countResult] = await Promise.all([dataQuery, countQuery]);
	const total = countResult[0]?.total ?? 0;

	return {
		total,
		data: data.map((r) => ({
			...r,
			monthlyFetches: parseInt(r.monthlyFetches ?? '0')
		}))
	};
}

export async function getOrgScopes(orgName: string) {
	const result = await db
		.select({
			...getTableColumns(tables.scope)
		})
		.from(tables.scope)
		.innerJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.where(eq(tables.org.name, orgName));

	return result;
}

export type TrackFetchOptions = {
	distinctId: string;
	scopeName: string;
	registryName: string;
	registryVersion: string;
	fileName: string;
};

export async function postFileFetch({
	distinctId,
	scopeName,
	registryName,
	registryVersion,
	fileName
}: TrackFetchOptions) {
	if (!(await postHogClient.isFeatureEnabled('trackAllFileFetches', distinctId))) {
		if (fileName !== 'jsrepo-manifest.json') return;
	}

	if (!(await postHogClient.isFeatureEnabled('trackFetches', distinctId))) return;

	await trackFetch(scopeName, registryName, registryVersion, fileName);
}

async function trackFetch(
	scopeName: string,
	registryName: string,
	version: string,
	fileName: string
) {
	const ver = await getVersion(scopeName, registryName, version);

	if (ver === null) return;

	await db
		.insert(tables.dailyRegistryFetch)
		.values({
			scopeId: ver.scope.id,
			registryId: ver.registry.id,
			versionId: ver.version.id,
			fileName,
			day: new Date().toLocaleDateString(),
			count: 1
		})
		.onConflictDoUpdate({
			target: [
				tables.dailyRegistryFetch.scopeId,
				tables.dailyRegistryFetch.registryId,
				tables.dailyRegistryFetch.versionId,
				tables.dailyRegistryFetch.fileName,
				tables.dailyRegistryFetch.day
			],
			set: { count: sql`${tables.dailyRegistryFetch.count} + 1` }
		});
}

export async function listPublishableScopes(userId: string): Promise<tables.Scope[]> {
	const result = await db
		.select({ ...getTableColumns(tables.scope) })
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.leftJoin(
			tables.user,
			and(
				eq(tables.user.id, userId),
				or(
					eq(tables.user.id, tables.scope.userId),
					eq(tables.user.id, tables.org.ownerId),
					and(eq(tables.user.id, tables.orgMember.userId), not(eq(tables.orgMember.role, 'member')))
				)
			)
		)
		.where(isNotNull(tables.user.id));

	return result;
}
