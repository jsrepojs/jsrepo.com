import {
	aliasedTable,
	and,
	eq,
	gt,
	inArray,
	isNotNull,
	isNull,
	or,
	type TablesRelationalConfig
} from 'drizzle-orm';
import { db } from '.';
import * as tables from './schema';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import semver from 'semver';
import { checkUserSubscription, PRO_PRODUCT_ID, TEAM_PRODUCT_ID } from '$lib/ts/polar/client';

export async function canPublishToScope(
	user: tables.User,
	scope: tables.Scope,
	privateRegistry: boolean
): Promise<boolean> {
	if (scope.userId === user.id) {
		if (!privateRegistry) return true;

		// check the subscription status
		if ([PRO_PRODUCT_ID, TEAM_PRODUCT_ID].includes(user.polarSubscriptionPlanId ?? '')) return true;

		return false;
	}

	// scope is owned by a user but not you, sorry
	if (scope.orgId === null) return false;

	const significantMembers = await db
		.select({
			id: tables.user.id,
			ownerId: tables.org.ownerId,
			polarSubscriptionPlanId: tables.user.polarSubscriptionPlanId,
			polarSubscriptionPlanEnd: tables.user.polarSubscriptionPlanEnd
		})
		.from(tables.org)
		.leftJoin(tables.org_member, eq(tables.org_member.orgId, tables.org.id))
		.innerJoin(
			tables.user,
			or(eq(tables.user.id, tables.org.ownerId), eq(tables.user.id, tables.org_member.userId))
		)
		.where(
			and(
				eq(tables.org.id, scope.orgId),
				or(eq(tables.user.id, user.id), eq(tables.user.id, tables.org.ownerId))
			)
		);

	const orgUser = significantMembers.find((m) => m.id === user.id);

	// not a part of the org
	if (!orgUser) return false;

	const owner = significantMembers.find((m) => m.id === m.ownerId)!;

	if (checkUserSubscription(owner) !== 'Team') return false;

	return true;
}

export async function getScope(scope: string): Promise<tables.Scope | null> {
	const scopes = await db.select().from(tables.scope).where(eq(tables.scope.name, scope));

	return scopes[0] ?? null;
}

export async function getUser(userId: string): Promise<tables.User | null> {
	const user = await db.select().from(tables.user).where(eq(tables.user.id, userId));

	return user[0] ?? null;
}

// export async function getScopePackages(userId: string, scope: string) {}

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
	registryName: string
): Promise<tables.Registry | null> {
	const registries = await db
		.select({
			id: tables.registry.id,
			name: tables.registry.name,
			private: tables.registry.private,
			scopeId: tables.registry.scopeId,
			createdAt: tables.registry.createdAt
		})
		.from(tables.scope)
		.innerJoin(tables.registry, eq(tables.scope.id, tables.registry.scopeId))
		.where(and(eq(tables.scope.name, scopeName), eq(tables.registry.name, registryName)));

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
		.where(and(eq(tables.scope.name, scopeName), eq(tables.registry.name, registryName)));

	if (versions.length === 0) return null;

	return versions;
}

export async function createRegistry(
	tx: PgTransaction<PostgresJsQueryResultHKT, Record<string, never>, TablesRelationalConfig>,
	record: {
		name: string;
		scopeId: number;
		private: boolean;
	}
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
	record: { registryId: number; version: string; tag: string | null; releasedById: string, hasReadme: boolean },
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
		.leftJoin(tables.org_member, eq(tables.org_member.orgId, tables.org.id))
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

				// access check
				or(
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
							and(
								inArray(tables.user.polarSubscriptionPlanId, [PRO_PRODUCT_ID, TEAM_PRODUCT_ID]),
								or(
									isNull(tables.user.polarSubscriptionPlanEnd),
									gt(tables.user.polarSubscriptionPlanEnd, new Date())
								)
							)
						),

						// Team
						and(
							isNotNull(tables.scope.orgId),

							// check if we are part of the organization
							or(eq(tables.org.ownerId, userId ?? ''), eq(tables.org_member.userId, userId ?? '')),

							// check the status of the owners subscription plan
							and(
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

	if (result.length === 0) return null;

	return result[0].content;
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
			.select()
			.from(tables.org)
			.leftJoin(tables.org_member, eq(tables.org.id, tables.org_member.orgId))
			.innerJoin(tables.scope, eq(tables.org.id, tables.scope.orgId))
			.where(or(eq(tables.org.ownerId, userId), eq(tables.org_member.userId, userId)))
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
		.leftJoin(tables.org_member, eq(tables.org_member.orgId, tables.org.id))
		.where(or(eq(tables.org.ownerId, userId), eq(tables.org_member.userId, userId)));

	return result;
}

/** Gets the registries belonging to the scope regardless of the subscription status
 *
 * @param userId
 * @param scopeName
 */
export async function getScopePackages(userId: string | null, scopeName: string) {
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
		.leftJoin(tables.org_member, eq(tables.org_member.orgId, tables.org.id))
		.innerJoin(tables.registry, eq(tables.scope.id, tables.registry.scopeId))
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(owner, eq(owner.id, tables.org.ownerId))
		.where(
			and(
				eq(tables.scope.name, scopeName),

				// access check
				or(
					// registry is not private
					eq(tables.registry.private, false),

					or(
						and(
							isNotNull(tables.scope.userId),

							// check if we own the scope
							eq(tables.scope.userId, userId ?? '')
						),

						// Team
						and(
							isNotNull(tables.scope.orgId),

							// check if we are part of the organization
							or(eq(tables.org.ownerId, userId ?? ''), eq(tables.org_member.userId, userId ?? ''))
						)
					)
				)
			)
		);

	return result;
}
