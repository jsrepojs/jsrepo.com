import {
	aliasedTable,
	and,
	eq,
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
import { generateId } from 'better-auth';
import assert from 'assert';
import { db } from '.';
import * as tables from './schema';
import type { PgColumn, PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import semver from 'semver';
import * as v from 'valibot';
import { posthog } from '$lib/ts/posthog';
import { DAY } from '$lib/ts/time';
import { checkUserSubscription } from '$lib/ts/stripe/client';

export type tx = PgTransaction<
	PostgresJsQueryResultHKT,
	Record<string, never>,
	TablesRelationalConfig
>;

export type UserWithSubscription = tables.User & {
	subscription: tables.Subscription | null;
};

export type FullOrg = tables.Org & {
	subscription: tables.Subscription | null;
	members: (tables.OrgMember & { user: tables.User })[];
	status: 'paid' | 'freebee' | 'delinquent';
};

export async function canPublishToScope(
	user: UserWithSubscription,
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

	const org = await getOrg({ id: scope.orgId });

	if (org === null) return false;

	const member = org.members.find((m) => m.userId === user.id);

	// not a part of the org or doesn't have publish access
	if (!member) return false;

	// if we aren't the owner and we can't publish on our own
	if (member.role !== null && !canPublish(member.role)) return false;

	if (org.status === 'delinquent') return false;

	return true;
}

export function canPublish(role: tables.OrgRole) {
	if (role === 'member') return false;

	if (role === 'publisher') return true;

	if (role === 'owner') return true;

	return false;
}

export async function getScope(scope: string): Promise<tables.Scope | null> {
	const scopes = await db.select().from(tables.scope).where(eq(tables.scope.name, scope));

	if (scopes.length === 0) return null;

	return scopes[0];
}

/** This has sensitive info that shouldn't be displayed to users */
export async function getUser(userId: string): Promise<UserWithSubscription | null> {
	const result = await db
		.select({
			...getTableColumns(tables.user),
			subscription: tables.subscription
		})
		.from(tables.user)
		// only get an active subscription
		.leftJoin(
			tables.subscription,
			and(
				eq(tables.subscription.referenceId, tables.user.id),
				eq(tables.subscription.status, 'active')
			)
		)
		.where(eq(tables.user.id, userId));

	if (result.length === 0) return null;

	return result[0];
}

export async function createScope(record: {
	name: string;
	orgId?: string | null;
	userId?: string | null;
}): Promise<number | null> {
	const result = await db.insert(tables.scope).values(record).returning({ id: tables.scope.id });

	return result[0]?.id ?? null;
}

export async function getRegistry(
	scopeName: string,
	registryName: string,
	userId: string | null
): Promise<RegistryDetails | null> {
	const thirtyDaysAgo = new Date(Date.now() - DAY * 30).toISOString().slice(0, 10);

	const orgSubscription = aliasedTable(tables.subscription, 'org_subscription');

	const registries = await db
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
		.leftJoin(tables.subscription, eq(tables.subscription.referenceId, tables.user.id))
		.leftJoin(orgSubscription, eq(orgSubscription.referenceId, tables.org.id))
		.where(
			and(
				eq(tables.scope.name, scopeName),
				eq(tables.registry.name, registryName),

				checkAccessQuery({ orgSubscription, checkSubscription: true })
			)
		)
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
			tables.version.id,
			tables.version.registryId,
			tables.version.tag,
			tables.version.createdAt
		);

	if (registries.length === 0) return null;

	return { ...registries[0], monthlyFetches: parseInt(registries[0].monthlyFetches ?? '0') };
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

type GetVersionOptions = {
	scopeName: string;
	registryName: string;
	version: string;
	/** WARNING: Specifying undefined as the userId will skip the access check */
	userId: string | null | undefined;
};

export async function getVersion({
	scopeName,
	registryName,
	version,
	userId
}: GetVersionOptions): Promise<
	| (tables.Version & { scope: tables.Scope; registry: tables.Registry; releasedBy: tables.User })
	| null
> {
	const isTag = !semver.valid(version);

	const releasedBy = aliasedTable(tables.user, 'released_by');
	const orgSubscription = aliasedTable(tables.subscription, 'org_subscription');

	const result = await db
		.select({
			...getTableColumns(tables.version),
			scope: tables.scope,
			registry: tables.registry,
			releasedBy: releasedBy
		})
		.from(tables.version)
		.innerJoin(tables.registry, eq(tables.registry.id, tables.version.registryId))
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.innerJoin(releasedBy, eq(releasedBy.id, tables.version.releasedById))
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(tables.subscription, eq(tables.subscription.referenceId, tables.user.id))
		.leftJoin(orgSubscription, eq(orgSubscription.referenceId, tables.org.id))
		.where(
			and(
				eq(tables.scope.name, scopeName),
				eq(tables.registry.name, registryName),
				eq(isTag ? tables.version.tag : tables.version.version, version),

				userId !== undefined
					? checkAccessQuery({ orgSubscription, checkSubscription: true })
					: undefined
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

type GetFileContentsOptions = {
	userId: string | null;
	scopeName: string;
	registryName: string;
	version: string;
	fileName: string;
};

export async function getFileContents({
	userId,
	scopeName,
	registryName,
	version,
	fileName
}: GetFileContentsOptions): Promise<string | null> {
	const isTag = !semver.valid(version);

	const orgSubscription = aliasedTable(tables.subscription, 'org_subscription');

	const result = await db
		.select({ content: tables.file.content })
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.innerJoin(tables.registry, eq(tables.scope.id, tables.registry.scopeId))
		.innerJoin(tables.version, eq(tables.registry.id, tables.version.registryId))
		.innerJoin(tables.file, eq(tables.version.id, tables.file.versionId))
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(tables.subscription, eq(tables.subscription.referenceId, tables.user.id))
		.leftJoin(orgSubscription, eq(orgSubscription.referenceId, tables.org.id))
		.where(
			and(
				eq(tables.scope.name, scopeName),
				eq(tables.registry.name, registryName),
				eq(isTag ? tables.version.tag : tables.version.version, version),
				eq(tables.file.name, fileName),

				checkAccessQuery({ orgSubscription, checkSubscription: true })
			)
		);

	if (result.length === 0) return null;

	return result[0].content;
}

/** We do this because an extra trip to get the session the easy way costs us another 250ms. So instead we just make it part of the query.
 *
 * @param param0
 * @returns
 */
export async function getFileContentsTheHardWay({
	scopeName,
	registryName,
	version,
	fileName,
	sessionToken,
	apiKey
}: Omit<GetFileContentsOptions, 'userId'> & {
	sessionToken: string | null;
	apiKey: string | null;
}): Promise<{ content: string; private: boolean } | null> {
	const isTag = !semver.valid(version);

	const orgSubscription = aliasedTable(tables.subscription, 'org_subscription');

	const result = await db
		.select({ private: tables.registry.private, content: tables.file.content })
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.innerJoin(tables.registry, eq(tables.scope.id, tables.registry.scopeId))
		.innerJoin(tables.version, eq(tables.registry.id, tables.version.registryId))
		.innerJoin(tables.file, eq(tables.version.id, tables.file.versionId))
		.leftJoin(tables.apikey, eq(tables.apikey.key, apiKey ?? ''))
		.leftJoin(tables.session, eq(tables.session.token, sessionToken ?? ''))
		.leftJoin(
			tables.user,
			or(eq(tables.user.id, tables.session.userId), eq(tables.user.id, tables.apikey.userId))
		)
		.leftJoin(tables.subscription, eq(tables.subscription.referenceId, tables.user.id))
		.leftJoin(orgSubscription, eq(orgSubscription.referenceId, tables.org.id))
		.where(
			and(
				eq(tables.scope.name, scopeName),
				eq(tables.registry.name, registryName),
				eq(isTag ? tables.version.tag : tables.version.version, version),
				eq(tables.file.name, fileName),

				checkAccessQuery({ orgSubscription, checkSubscription: true })
			)
		);

	if (result.length === 0) return null;

	return result[0];
}

export async function getFiles(
	userId: string | null,
	scopeName: string,
	registryName: string,
	version: string,
	filesNames: string[]
): Promise<tables.File[]> {
	const isTag = !semver.valid(version);

	const orgSubscription = aliasedTable(tables.subscription, 'org_subscription');

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
		.leftJoin(tables.subscription, eq(tables.subscription.referenceId, tables.user.id))
		.leftJoin(orgSubscription, eq(orgSubscription.referenceId, tables.org.id))
		.where(
			and(
				eq(tables.scope.name, scopeName),
				eq(tables.registry.name, registryName),
				eq(isTag ? tables.version.tag : tables.version.version, version),
				inArray(tables.file.name, filesNames),

				checkAccessQuery({ orgSubscription, checkSubscription: true })
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
			.where(or(eq(tables.orgMember.userId, userId)))
	]);

	return {
		userScopes,
		orgScopes
	};
}

export async function listMyOrganizations(userId: string) {
	const result = await db
		.selectDistinctOn([tables.org.id])
		.from(tables.org)
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.where(eq(tables.orgMember.userId, userId));

	return result;
}

/** Gets the registries belonging to the scope regardless of the subscription status
 *
 * @param userId
 * @param scopeName
 */
export async function getScopeRegistries(userId: string | null, scopeName: string) {
	const orgSubscription = aliasedTable(tables.subscription, 'org_subscription');

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
		.leftJoin(tables.subscription, eq(tables.subscription.referenceId, tables.user.id))
		.leftJoin(orgSubscription, eq(orgSubscription.referenceId, tables.org.id))
		.where(
			and(
				eq(tables.scope.name, scopeName),

				// access check
				checkAccessQuery({ orgSubscription, checkSubscription: false })
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
 * You need to join the following tables tables.scope, tables.registry
 *
 * You also need tables.user, tables.subscription (for the user trying to access the resource)
 *
 * You also need owner (alias of tables.user), ownerSubscription (for the owner of the scope)
 */
function checkAccessQuery({
	orgSubscription,
	checkSubscription = true
}: {
	orgSubscription: typeof tables.subscription;
	checkSubscription: boolean;
}) {
	return or(
		// registry is not private
		eq(tables.registry.private, false),

		// registry is private but they have access and have paid their subscription
		or(
			// User owned scope
			and(
				isNotNull(tables.scope.userId),

				// check if we own the scope
				eq(tables.scope.userId, tables.user.id),

				// check the status of the users subscription plan
				checkSubscription
					? and(
							// has an active Pro plan
							eq(tables.subscription.plan, 'pro'),
							eq(tables.subscription.status, 'active')
						)
					: undefined
			),

			// Org owned scope
			and(
				isNotNull(tables.scope.orgId),

				// check if we are part of the organization
				or(eq(tables.orgMember.userId, tables.user.id)),

				// check the status of the owners subscription plan
				checkSubscription
					? and(
							isNotNull(orgSubscription.id),
							// owner has an active Pro plan
							eq(orgSubscription.plan, 'pro'),
							eq(orgSubscription.status, 'active')
						)
					: undefined
			)
		)
	);
}

export async function getOrg({
	id,
	name
}: { id: string; name?: never } | { name: string; id?: never }): Promise<FullOrg | null> {
	const result = await db
		.select({
			...getTableColumns(tables.org),
			subscription: tables.subscription,
			member: tables.orgMember,
			user: tables.user
		})
		.from(tables.org)
		.leftJoin(
			tables.subscription,
			and(
				eq(tables.subscription.referenceId, tables.org.id),
				eq(tables.subscription.status, 'active')
			)
		)
		.innerJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.innerJoin(tables.user, eq(tables.user.id, tables.orgMember.userId))
		.where(id === undefined ? eq(tables.org.name, name) : eq(tables.org.id, id));

	if (result.length === 0) return null;

	const org = result[0];
	const members = result.map((r) => ({ ...r.member, user: r.user }));

	let status: FullOrg['status'];

	if (org.subscription === null) {
		if (org.courtesyMonthEndedAt === null || org.courtesyMonthEndedAt.valueOf() < Date.now()) {
			status = 'freebee';
		} else {
			status = 'delinquent';
		}
	} else {
		// give the org a free seat for the owner
		const neededSeats = members.length - 1;

		if ((org.subscription.seats ?? 0) >= neededSeats) {
			status = 'paid'
		} else {
			if (org.courtesyMonthEndedAt === null || org.courtesyMonthEndedAt.valueOf() < Date.now()) {
				status = 'freebee';
			} else {
				status = 'delinquent'
			}
		}
	}

	return {
		...org,
		members,
		status
	} satisfies FullOrg;
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
			tables.orgMember,
			and(eq(tables.orgMember.orgId, tables.org.id), eq(tables.orgMember.userId, userId))
		)
		.leftJoin(
			tables.user,
			or(eq(tables.user.id, tables.scope.userId), eq(tables.orgMember.role, 'owner'))
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
		const org = await getOrg({ name: search });

		if (org === null) return null;

		return 'org';
	}
}

export async function getScopeWithOwner(name: string): Promise<
	| (tables.Scope & {
			user: tables.User | null;
			org: (tables.Org & { members: tables.OrgMember[] }) | null;
	  })
	| null
> {
	const result = await db
		.select({
			...getTableColumns(tables.scope),
			user: tables.user,
			org: tables.org,
			member: tables.orgMember
		})
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.leftJoin(tables.user, eq(tables.user.id, tables.scope.userId))
		.where(eq(tables.scope.name, name));

	if (result.length === 0) return null;

	if (result[0].user !== null) {
		return { ...result[0], user: result[0].user, org: null };
	}

	assert(result[0].org !== null, 'must be an org owned scope');

	return {
		...result[0],
		user: null,
		org: { ...result[0].org, members: result.map((r) => r.member!) }
	};
}

/** You have scope access if 1 you are the owner or 2 you are a member of a team which is maintaining an active subscription.
 *
 * @param name
 */
export async function hasScopeAccess(userId: string | null, name: string) {
	const orgSubscription = aliasedTable(tables.subscription, 'owner_subscription');

	const result = await db
		.select({
			id: tables.scope.id
		})
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(orgSubscription, eq(orgSubscription.referenceId, tables.org.id))
		.where(
			and(
				eq(tables.scope.name, name),

				// access check
				or(
					// User owned scope
					and(
						isNotNull(tables.scope.userId),

						eq(tables.scope.userId, userId ?? '')
					),

					// Org owned scope
					and(
						isNotNull(tables.scope.orgId),

						// either we are the owner or we are a member of the team with the subscription active
						or(
							// we are an owner
							and(eq(tables.orgMember.userId, userId ?? ''), eq(tables.orgMember.role, 'owner')),

							// we are a member and subscription is paid
							and(
								eq(tables.orgMember.userId, userId ?? ''),

								isNotNull(orgSubscription.id),
								eq(orgSubscription.plan, 'pro'),
								eq(orgSubscription.status, 'active')
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
		.leftJoin(
			tables.orgMember,
			and(
				eq(tables.scopeTransferRequest.newOrgId, tables.orgMember.orgId),
				eq(tables.orgMember.userId, userId),
				eq(tables.orgMember.role, 'owner')
			)
		)
		.innerJoin(
			tables.user,
			or(
				eq(tables.user.id, tables.orgMember.userId),
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
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.innerJoin(
			tables.user,
			or(
				and(eq(tables.user.id, tables.orgMember.id), eq(tables.orgMember.role, 'owner')),
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
	newOrgId?: string | null;
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
	userId: string,
	record: Omit<InferInsertModel<typeof tables.org>, 'id'>
): Promise<tables.Org | null> {
	const result = await db.transaction(async (tx) => {
		const orgs = await db
			.insert(tables.org)
			.values({ ...record, id: `org_${generateId()}` })
			.returning();

		if (orgs.length === 0) {
			tx.rollback();
		}

		const org = orgs[0];

		const members = await db
			.insert(tables.orgMember)
			.values({ orgId: org.id, userId, role: 'owner' })
			.returning();

		if (members.length === 0) {
			tx.rollback();
		}

		return org;
	});

	if (!result) return null;

	return result;
}

export async function createOrgInvite(record: InferInsertModel<typeof tables.orgInvite>) {
	const result = await db.insert(tables.orgInvite).values(record).returning();

	if (result.length === 0) return null;

	return result[0];
}

export async function getOrgInvitesForEmail(email: string, orgId: string | null = null) {
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
		.innerJoin(member, eq(member.id, tables.orgMember.userId))
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
	lang: string | null;
	/** So users can see private registries they have access to */
	userId: string | null;
	offset: number | null;
	limit: number | null;
	orderBy: PgColumn | SQL | undefined | null;
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
	orderBy,
	lang
}: Partial<RegistrySearchOptions>): Promise<{ total: number; data: RegistryDetails[] }> {
	const thirtyDaysAgo = new Date(Date.now() - DAY * 30).toISOString().slice(0, 10);

	const orgSubscription = aliasedTable(tables.subscription, 'org_subscription');

	// Weighted score expression
	const qNoAt = q?.replace(/^@/, '') ?? '';
	const scoreExpr = sql`
	  (
		(CASE WHEN (${tables.scope.name} || '/' || ${tables.registry.name}) ILIKE ${'%' + qNoAt + '%'} THEN 10 ELSE 0 END)
		+
		(CASE WHEN EXISTS (
		  SELECT 1 FROM unnest(${tables.registry.metaTags}) AS tag
		  WHERE tag ILIKE ${'%' + q + '%'}
		) THEN 8 ELSE 0 END)
		+
		(CASE WHEN ${tables.registry.metaDescription} ILIKE ${'%' + q + '%'} THEN 3 ELSE 0 END)
	  )::int
	`.as('score');

	const whereClause = and(
		q
			? q.startsWith('@')
				? ilike(sql`'@' || ${tables.scope.name} || '/' || ${tables.registry.name}`, `${q}%`)
				: or(
						ilike(sql`${tables.scope.name} || '/' || ${tables.registry.name}`, `%${qNoAt}%`),
						ilike(tables.registry.metaDescription, `%${q}%`),
						sql`EXISTS (
				SELECT 1 FROM unnest(${tables.registry.metaTags}) AS tag
				WHERE tag ILIKE ${'%' + q + '%'}
			  )`
					)
			: undefined,
		org ? eq(tables.org.name, org) : undefined,
		scope ? eq(tables.scope.name, scope) : undefined,
		lang ? eq(tables.registry.metaPrimaryLanguage, lang) : undefined,
		checkAccessQuery({ orgSubscription, checkSubscription: true }),

		// filter out results with 0 score
		q
			? sql`(
		  (CASE WHEN (${tables.scope.name} || '/' || ${tables.registry.name}) ILIKE ${'%' + qNoAt + '%'} THEN 10 ELSE 0 END)
		  +
		  (CASE WHEN EXISTS (
		    SELECT 1 FROM unnest(${tables.registry.metaTags}) AS tag
		    WHERE tag ILIKE ${'%' + q + '%'}
		  ) THEN 8 ELSE 0 END)
		  +
		  (CASE WHEN ${tables.registry.metaDescription} ILIKE ${'%' + q + '%'} THEN 3 ELSE 0 END)
		) > 0`
			: undefined
	);

	let dataQuery = db
		.select({
			...getTableColumns(tables.registry),
			scope: tables.scope,
			org: tables.org,
			latestVersion: tables.version,
			monthlyFetches: sum(tables.dailyRegistryFetch.count),
			score: scoreExpr
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
		.leftJoin(tables.subscription, eq(tables.subscription.referenceId, tables.user.id))
		.leftJoin(orgSubscription, eq(orgSubscription.referenceId, tables.org.id))
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
			tables.version.id,
			tables.version.registryId,
			tables.version.tag,
			tables.version.createdAt
		);

	if (orderBy) {
		// @ts-expect-error wrong
		dataQuery = dataQuery.orderBy(orderBy);
	} else {
		// @ts-expect-error wrong
		dataQuery = dataQuery.orderBy(sql`score DESC`);
	}

	if (limit) {
		// @ts-expect-error wrong
		dataQuery = dataQuery.limit(limit);
	}

	// @ts-expect-error wrong
	dataQuery = dataQuery.offset(offset ?? 0);

	const countQuery = db
		.select({ total: countDistinct(tables.registry.id) })
		.from(tables.registry)
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(tables.subscription, eq(tables.subscription.referenceId, tables.user.id))
		.leftJoin(orgSubscription, eq(orgSubscription.referenceId, tables.org.id))
		.where(whereClause);

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
	if (!(await posthog.isFeatureEnabled('trackAllFileFetches', distinctId))) {
		if (fileName !== 'jsrepo-manifest.json') return;
	}

	if (!(await posthog.isFeatureEnabled('trackFetches', distinctId))) return;

	await trackFetch(scopeName, registryName, registryVersion, fileName);
}

async function trackFetch(
	scopeName: string,
	registryName: string,
	version: string,
	fileName: string
) {
	const ver = await getVersion({ scopeName, registryName, version, userId: undefined });

	if (ver === null) return;

	await db
		.insert(tables.dailyRegistryFetch)
		.values({
			scopeId: ver.scope.id,
			registryId: ver.registry.id,
			versionId: ver.id,
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
					and(eq(tables.user.id, tables.orgMember.userId), not(eq(tables.orgMember.role, 'member')))
				)
			)
		)
		.where(isNotNull(tables.user.id));

	return result;
}

export async function getPublicDownloads({
	scope,
	registryName,
	from
}: {
	scope: string;
	registryName: string;
	from: Date;
}): Promise<number> {
	const result = await db
		.select({ downloads: sum(tables.dailyRegistryFetch.count) })
		.from(tables.dailyRegistryFetch)
		.innerJoin(tables.scope, eq(tables.scope.id, tables.dailyRegistryFetch.scopeId))
		.innerJoin(tables.registry, eq(tables.registry.id, tables.dailyRegistryFetch.registryId))
		.where(
			and(
				eq(tables.scope.name, scope),
				eq(tables.registry.name, registryName),
				eq(tables.registry.private, false),
				eq(tables.dailyRegistryFetch.fileName, 'jsrepo-manifest.json'),
				gte(tables.dailyRegistryFetch.day, from.toISOString().slice(0, 10))
			)
		);

	if (result.length === 0) return 0;

	return parseInt(result[0].downloads ?? '0');
}

export async function startCourtesyMonth(orgId: string) {
	const start = new Date();
	const end = new Date(start.valueOf() + DAY * 30);

	const result = await db
		.update(tables.org)
		.set({ courtesyMonthStartedAt: start, courtesyMonthEndedAt: end })
		.where(eq(tables.org.id, orgId))
		.returning();

	return result.length > 0;
}
