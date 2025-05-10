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
	not,
	gt,
	notLike
} from 'drizzle-orm';
import { generateId, type User } from 'better-auth';
import assert from 'assert';
import { db } from '.';
import * as tables from './schema';
import type { PgColumn, PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import semver from 'semver';
import { posthog } from '$lib/ts/posthog';
import { DAY, MINUTE } from '$lib/ts/time';
import { checkUserSubscription, PLANS } from '$lib/ts/stripe/client';
import { lower } from './schema';
import { customAlphabet, nanoid } from 'nanoid';
import * as crypto from '$lib/ts/crypto';
import { resend, SUPPORT_EMAIL } from '$lib/ts/resend';
import { auth } from '$lib/auth';

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
	status: {
		type: 'paid' | 'freebee' | 'delinquent';
		message?: string;
	};
	billPayer: tables.User | null;
	billPayerSubscription: tables.Subscription | null;
};

export async function canPublishToScope(
	user: UserWithSubscription,
	scope: tables.Scope,
	access: tables.RegistryAccess
): Promise<{ canPublish: boolean; reason?: string }> {
	if (scope.userId === user.id) {
		if (access === 'public') return { canPublish: true };

		// any paid plan is fine
		if (checkUserSubscription(user) !== null) return { canPublish: true };

		return {
			canPublish: false,
			reason: 'you must be subscribed to pro to publish private registries'
		};
	}

	// scope is owned by a user but not you, sorry
	if (scope.orgId === null) return { canPublish: false };

	const org = await getOrg({ id: scope.orgId });

	if (org === null) return { canPublish: false };

	const member = org.members.find((m) => m.userId === user.id);

	// not a part of the org or doesn't have publish access
	if (!member) return { canPublish: false, reason: 'you are not part of this org' };

	// if we aren't the owner and we can't publish on our own
	if (member.role !== null && !canPublish(member.role))
		return { canPublish: false, reason: "you don't have publish access for this org" };

	if (org.status.type === 'delinquent')
		return { canPublish: false, reason: "you haven't paid your org subscription" };

	return { canPublish: true };
}

export function canPublish(role: tables.OrgRole) {
	if (role === 'member') return false;

	if (role === 'publisher') return true;

	if (role === 'owner') return true;

	return false;
}

export async function getScope(scope: string): Promise<tables.Scope | null> {
	const scopes = await db
		.select()
		.from(tables.scope)
		.where(eq(lower(tables.scope.name), scope.toLowerCase()));

	if (scopes.length === 0) return null;

	return scopes[0];
}

type GetUserOptions =
	| { id: string; email?: undefined; username?: undefined }
	| { email: string; id?: undefined; username?: undefined }
	| { username: string; email?: undefined; id?: undefined };

/** This has sensitive info that shouldn't be displayed to users */
export async function getUser({
	id,
	email,
	username
}: GetUserOptions): Promise<UserWithSubscription | null> {
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
		.where(
			and(
				id ? eq(tables.user.id, id) : undefined,
				email ? eq(tables.user.email, email) : undefined,
				username ? eq(tables.user.username, username) : undefined
			)
		);

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

export async function getRegistry({
	scopeName,
	registryName,
	registryId,
	userId
}:
	| {
			scopeName: string;
			registryName: string;
			registryId?: never;
			userId: string | null;
	  }
	| {
			scopeName?: never;
			registryName?: never;
			registryId: number;
			userId: string | null;
	  }): Promise<RegistryDetails | null> {
	const thirtyDaysAgo = new Date(Date.now() - DAY * 30).toISOString().slice(0, 10);

	const releasedBy = aliasedTable(tables.user, 'released_by');
	const orgSubscription = aliasedTable(tables.subscription, 'org_subscription');
	const billPayerSubscription = aliasedTable(tables.subscription, 'bill_payer_subscription');
	const linkedStripeAccount = aliasedTable(tables.user, 'linked_stripe_account');

	const registries = await db
		.select({
			...getTableColumns(tables.registry),
			scope: tables.scope,
			org: tables.org,
			latestVersion: tables.version,
			monthlyFetches: sum(tables.dailyRegistryFetch.count),
			releasedBy: releasedBy,
			connectedStripeAccount: linkedStripeAccount
		})
		.from(tables.registry)
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.leftJoin(
			tables.version,
			and(eq(tables.version.registryId, tables.registry.id), eq(tables.version.tag, 'latest'))
		)
		.leftJoin(releasedBy, eq(releasedBy.id, tables.version.releasedById))
		.leftJoin(
			tables.dailyRegistryFetch,
			and(
				eq(tables.dailyRegistryFetch.registryId, tables.registry.id),
				eq(tables.dailyRegistryFetch.fileName, 'jsrepo-manifest.json'),
				gte(tables.dailyRegistryFetch.day, thirtyDaysAgo)
			)
		)
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(
			linkedStripeAccount,
			eq(linkedStripeAccount.stripeSellerAccountId, tables.registry.stripeConnectAccountId)
		)
		.leftJoin(tables.subscription, eq(tables.subscription.referenceId, tables.user.id))
		.leftJoin(orgSubscription, eq(orgSubscription.referenceId, tables.org.id))
		.leftJoin(
			billPayerSubscription,
			and(
				eq(billPayerSubscription.stripeCustomerId, orgSubscription.stripeCustomerId),
				notLike(billPayerSubscription.referenceId, 'org_%'),
				eq(billPayerSubscription.plan, 'pro'),
				eq(billPayerSubscription.status, 'active')
			)
		)
		.where(
			and(
				registryId
					? eq(tables.registry.id, registryId)
					: and(
							eq(lower(tables.scope.name), scopeName!.toLowerCase()),
							eq(lower(tables.registry.name), registryName!.toLowerCase())
						),

				checkAccessQuery({ orgSubscription, billPayerSubscription, checkSubscription: true })
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
			tables.version.createdAt,
			tables.version.releasedById,
			releasedBy.id,
			linkedStripeAccount.id
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
		.where(
			and(
				eq(lower(tables.scope.name), scopeName.toLowerCase()),
				eq(lower(tables.registry.name), registryName.toLowerCase())
			)
		)
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
	const billPayerSubscription = aliasedTable(tables.subscription, 'bill_payer_subscription');

	const result = await db
		.select({
			...getTableColumns(tables.version),
			scope: tables.scope,
			registry: tables.registry,
			releasedBy: {
				id: releasedBy.id,
				name: releasedBy.name,
				image: releasedBy.image,
				createdAt: releasedBy.createdAt
			}
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
		.leftJoin(
			billPayerSubscription,
			and(
				eq(billPayerSubscription.stripeCustomerId, orgSubscription.stripeCustomerId),
				notLike(billPayerSubscription.referenceId, 'org_%'),
				eq(billPayerSubscription.plan, 'pro'),
				eq(billPayerSubscription.status, 'active')
			)
		)
		.where(
			and(
				eq(lower(tables.scope.name), scopeName.toLowerCase()),
				eq(lower(tables.registry.name), registryName.toLowerCase()),
				eq(isTag ? tables.version.tag : tables.version.version, version),

				userId !== undefined
					? checkAccessQuery({ orgSubscription, billPayerSubscription, checkSubscription: true })
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

type GetFileContentsFastOptions = {
	userId: string | null;
	scopeName: string;
	registryName: string;
	version: string;
	fileName: string;
};

/** We do this because an extra trip to get the session the easy way costs us another 250ms. So instead we just make it part of the query.
 *
 * @param param0
 * @returns
 */
export async function getFileContentsFast({
	scopeName,
	registryName,
	version,
	fileName,
	sessionToken,
	apiKey
}: Omit<GetFileContentsFastOptions, 'userId'> & {
	sessionToken: string | null;
	apiKey: string | null;
}): Promise<{ content: string; access: tables.RegistryAccess } | null> {
	const isTag = !semver.valid(version);

	const orgSubscription = aliasedTable(tables.subscription, 'org_subscription');
	const billPayerSubscription = aliasedTable(tables.subscription, 'bill_payer_subscription');

	const result = await db
		.select({ access: tables.registry.access, content: tables.file.content })
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.innerJoin(tables.registry, eq(tables.scope.id, tables.registry.scopeId))
		.innerJoin(tables.version, eq(tables.registry.id, tables.version.registryId))
		.innerJoin(tables.file, eq(tables.version.id, tables.file.versionId))
		.leftJoin(
			tables.apikey,
			and(eq(tables.apikey.key, apiKey ?? ''), eq(tables.apikey.enabled, true))
		)
		.leftJoin(tables.session, eq(tables.session.token, sessionToken ?? ''))
		.leftJoin(
			tables.user,
			or(eq(tables.user.id, tables.session.userId), eq(tables.user.id, tables.apikey.userId))
		)
		.leftJoin(tables.subscription, eq(tables.subscription.referenceId, tables.user.id))
		.leftJoin(orgSubscription, eq(orgSubscription.referenceId, tables.org.id))
		.leftJoin(
			billPayerSubscription,
			and(
				eq(billPayerSubscription.stripeCustomerId, orgSubscription.stripeCustomerId),
				notLike(billPayerSubscription.referenceId, 'org_%'),
				eq(billPayerSubscription.plan, 'pro'),
				eq(billPayerSubscription.status, 'active')
			)
		)
		.where(
			and(
				eq(lower(tables.scope.name), scopeName.toLowerCase()),
				eq(lower(tables.registry.name), registryName.toLowerCase()),
				eq(isTag ? tables.version.tag : tables.version.version, version),
				eq(tables.file.name, fileName),

				checkAccessQuery({ orgSubscription, billPayerSubscription, checkSubscription: true })
			)
		);

	if (result.length === 0) return null;

	return result[0];
}

type GetFilesOptions = {
	userId?: string | null;
	scopeName: string;
	registryName: string;
	version: string;
	fileNames: string[];
};

export async function getFiles({
	userId,
	scopeName,
	registryName,
	version,
	fileNames
}: GetFilesOptions): Promise<tables.File[]> {
	const isTag = !semver.valid(version);

	const orgSubscription = aliasedTable(tables.subscription, 'org_subscription');
	const billPayerSubscription = aliasedTable(tables.subscription, 'bill_payer_subscription');

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
		.leftJoin(
			billPayerSubscription,
			and(
				eq(billPayerSubscription.stripeCustomerId, orgSubscription.stripeCustomerId),
				notLike(billPayerSubscription.referenceId, 'org_%'),
				eq(billPayerSubscription.plan, 'pro'),
				eq(billPayerSubscription.status, 'active')
			)
		)
		.where(
			and(
				eq(lower(tables.scope.name), scopeName.toLowerCase()),
				eq(lower(tables.registry.name), registryName.toLowerCase()),
				eq(isTag ? tables.version.tag : tables.version.version, version),
				inArray(tables.file.name, fileNames),

				checkAccessQuery({ orgSubscription, billPayerSubscription, checkSubscription: true })
			)
		);

	return result;
}

export async function listApiKeys(userId: string) {
	const { key: _, ...columnsWithoutKey } = getTableColumns(tables.apikey);

	const keys = await db
		.select({
			...columnsWithoutKey
		})
		.from(tables.apikey)
		.where(
			and(
				eq(tables.apikey.userId, userId),

				// only show activated device keys
				or(isNull(tables.apikey.deviceSessionId), eq(tables.apikey.deviceActivated, true))
			)
		)
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
	const billPayerSubscription = aliasedTable(tables.subscription, 'bill_payer_subscription');

	const result = await db
		.select({
			id: tables.registry.id,
			name: tables.registry.name,
			access: tables.registry.access,
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
		.leftJoin(
			billPayerSubscription,
			and(
				eq(billPayerSubscription.stripeCustomerId, orgSubscription.stripeCustomerId),
				notLike(billPayerSubscription.referenceId, 'org_%'),
				eq(billPayerSubscription.plan, 'pro'),
				eq(billPayerSubscription.status, 'active')
			)
		)
		.where(
			and(
				eq(lower(tables.scope.name), scopeName.toLowerCase()),

				// access check
				checkAccessQuery({ orgSubscription, billPayerSubscription, checkSubscription: false })
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
	billPayerSubscription,
	checkSubscription = true,
	readonlyAccess = true
}: {
	orgSubscription: typeof tables.subscription;
	billPayerSubscription: typeof tables.subscription;
	checkSubscription: boolean;
	/** Readonly access means that a user can view the contents of the registry
	 * regardless of whether or not they are a part of its ownership */
	readonlyAccess?: boolean;
}) {
	if (readonlyAccess) {
		return or(
			eq(tables.registry.access, 'public'),

			// registry is private/marketplace but they have access and have paid their subscription
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
								eq(tables.subscription.plan, PLANS['pro'].name.toLowerCase()),
								eq(tables.subscription.status, 'active')
							)
						: undefined
				),

				// Org owned scope
				and(
					isNotNull(tables.scope.orgId),

					// check if we are part of the organization
					eq(tables.orgMember.userId, tables.user.id),

					// check the status of the owners subscription plan
					checkSubscription
						? or(
								// courtesy month
								and(gt(tables.org.courtesyMonthEndedAt, new Date())),

								// paid
								or(
									// no need to pay for a subscription if the org only has one member
									and(
										// we are the owner
										eq(tables.orgMember.role, 'owner'),
										// we are the sole member
										eq(tables.org.memberCount, 1),
										// we have an active pro plan
										eq(tables.subscription.plan, PLANS['pro'].name.toLowerCase()),
										eq(tables.subscription.status, 'active')
									),

									// org has seats and bill payer has an active pro plan
									and(
										isNotNull(orgSubscription.id),
										eq(orgSubscription.plan, PLANS['organizationSeat'].name.toLowerCase()),
										eq(orgSubscription.status, 'active'),
										eq(orgSubscription.hasEnoughSeats, true),
										isNotNull(billPayerSubscription.id)
									)
								)
							)
						: undefined
				)
			)
		);
	} else {
		return or(
			// User owned scope
			and(
				isNotNull(tables.scope.userId),

				// check if we own the scope
				eq(tables.scope.userId, tables.user.id),

				or(
					eq(tables.registry.access, 'public'),

					// if not public check the users plan
					checkSubscription
						? and(
								// has an active Pro plan
								eq(tables.subscription.plan, PLANS['pro'].name.toLowerCase()),
								eq(tables.subscription.status, 'active')
							)
						: undefined
				)
			),

			// Org owned scope
			and(
				isNotNull(tables.scope.orgId),

				// check if we are part of the organization
				eq(tables.orgMember.userId, tables.user.id),

				or(
					eq(tables.registry.access, 'public'),

					// check the status of the owners subscription plan
					checkSubscription
						? or(
								// courtesy month
								and(gt(tables.org.courtesyMonthEndedAt, new Date())),

								// paid
								or(
									// no need to pay for a subscription if the org only has one member
									and(
										// we are the owner
										eq(tables.orgMember.role, 'owner'),
										// we are the sole member
										eq(tables.org.memberCount, 1),
										// we have an active pro plan
										eq(tables.subscription.plan, PLANS['pro'].name.toLowerCase()),
										eq(tables.subscription.status, 'active')
									),

									// org has seats and bill payer has an active pro plan
									and(
										isNotNull(orgSubscription.id),
										eq(orgSubscription.plan, PLANS['organizationSeat'].name.toLowerCase()),
										eq(orgSubscription.status, 'active'),
										eq(orgSubscription.hasEnoughSeats, true),
										isNotNull(billPayerSubscription.id)
									)
								)
							)
						: undefined
				)
			)
		);
	}
}

export async function getOrg({
	id,
	name
}: { id: string; name?: never } | { name: string; id?: never }): Promise<FullOrg | null> {
	const billPayer = aliasedTable(tables.user, 'bill_payer');
	const billPayerSubscription = aliasedTable(tables.subscription, 'bill_payer_subscription');

	const result: (tables.Org & {
		subscription: tables.Subscription | null;
		member: tables.OrgMember;
		user: tables.User;
		billPayer: tables.User | null;
		billPayerSubscription: tables.Subscription | null;
	})[] = await db
		.select({
			...getTableColumns(tables.org),
			subscription: tables.subscription,
			member: tables.orgMember,
			user: tables.user,
			billPayer: billPayer,
			billPayerSubscription: billPayerSubscription
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
		.leftJoin(billPayer, eq(billPayer.stripeCustomerId, tables.subscription.stripeCustomerId))
		.leftJoin(
			billPayerSubscription,
			and(
				eq(billPayerSubscription.referenceId, billPayer.id),
				eq(billPayerSubscription.status, 'active')
			)
		)
		.where(
			id === undefined ? eq(lower(tables.org.name), name.toLowerCase()) : eq(tables.org.id, id)
		);

	if (result.length === 0) return null;

	const org = result[0];
	const members = result.map((r) => ({ ...r.member, user: r.user }));

	let status: FullOrg['status'] = { type: 'paid' };

	const billPayerUnpaid = org.billPayer !== null && org.billPayerSubscription === null;

	// give the org a free seat for the owner
	const neededSeats = members.length - 1;
	const seats = org.subscription?.seats ?? 0;

	if (org.subscription === null || billPayerUnpaid) {
		if (billPayerUnpaid) {
			if (org.courtesyMonthEndedAt !== null && org.courtesyMonthEndedAt.valueOf() > Date.now()) {
				status = {
					type: 'freebee',
					message: `The person paying the bill for this org is not maintaining an active subscription. Subscribe to the Pro plan before ${org.courtesyMonthEndedAt?.toDateString()} to prevent your team from losing access.`
				};
			} else {
				status = {
					type: 'delinquent',
					message:
						'The person paying the bill for this org is not maintaining an active subscription. Subscribe to pro to allow your team to regain access.'
				};
			}
		} else {
			if (neededSeats > 0) {
				if (org.courtesyMonthEndedAt !== null && org.courtesyMonthEndedAt.valueOf() > Date.now()) {
					status = {
						type: 'freebee',
						message: `You need to purchase at least ${neededSeats} seat(s) before ${org.courtesyMonthEndedAt?.toDateString()} or your team will lose access.`
					};
				} else {
					status = {
						type: 'delinquent',
						message: `You need to purchase at least ${neededSeats} seat(s) for your team to regain access.`
					};
				}
			}
		}
	} else {
		if (seats < neededSeats) {
			if (org.courtesyMonthEndedAt === null || org.courtesyMonthEndedAt.valueOf() < Date.now()) {
				status = {
					type: 'freebee',
					message: `You currently have more members than seats. Please purchase ${neededSeats - seats} seat(s) before ${org.courtesyMonthEndedAt?.toDateString()} to prevent your team from losing access.`
				};
			} else {
				status = {
					type: 'delinquent',
					message: `You currently have more members than seats. Please ${neededSeats - seats} seat(s) for your team to regain access.`
				};
			}
		}
	}

	return {
		...org,
		members,
		status
	} satisfies FullOrg;
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
		.where(and(eq(lower(tables.scope.name), scopeName.toLowerCase()), eq(tables.user.id, userId)));

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
		.where(eq(lower(tables.scope.name), name.toLowerCase()));

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
	const billPayerSubscription = aliasedTable(tables.subscription, 'bill_payer_subscription');

	const result = await db
		.select({
			id: tables.scope.id
		})
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(orgSubscription, eq(orgSubscription.referenceId, tables.org.id))
		.leftJoin(
			billPayerSubscription,
			and(
				eq(billPayerSubscription.stripeCustomerId, orgSubscription.stripeCustomerId),
				notLike(billPayerSubscription.referenceId, 'org_%'),
				eq(billPayerSubscription.plan, 'pro'),
				eq(billPayerSubscription.status, 'active')
			)
		)
		.where(
			and(
				eq(lower(tables.scope.name), name.toLowerCase()),

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
						// we are part of the org
						eq(tables.orgMember.userId, userId ?? ''),

						// either we are the owner or we are a member of the team with the subscription active
						or(
							// we are an owner
							eq(tables.orgMember.role, 'owner'),

							// subscription is paid
							or(
								// courtesy month
								and(gt(tables.org.courtesyMonthEndedAt, new Date())),

								// paid
								and(
									isNotNull(orgSubscription.id),

									// owner has an active Pro plan
									eq(orgSubscription.plan, PLANS['organizationSeat'].name.toLowerCase()),
									eq(orgSubscription.status, 'active'),
									eq(orgSubscription.hasEnoughSeats, true),
									isNotNull(billPayerSubscription.id)
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
				eq(lower(tables.scope.name), name.toLowerCase()),

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
				and(eq(tables.user.id, tables.orgMember.userId), eq(tables.orgMember.role, 'owner')),
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

	const connectedRegistries = await tx
		.select()
		.from(tables.scope)
		.innerJoin(tables.registry, eq(tables.registry.scopeId, tables.scope.id))
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.innerJoin(
			tables.user,
			eq(tables.user.stripeSellerAccountId, tables.registry.stripeConnectAccountId)
		)
		.where(
			and(
				eq(tables.scope.id, request.scopeId),

				and(
					// is not an org member
					or(isNull(tables.orgMember.userId), not(eq(tables.user.id, tables.orgMember.userId))),

					// is not the scope owner
					not(eq(tables.user.id, tables.scope.userId))
				)
			)
		);

	await tx
		.update(tables.registry)
		.set({ stripeConnectAccountId: null })
		.where(
			inArray(
				tables.registry.id,
				connectedRegistries.map((r) => r.registry.id)
			)
		);

	return true;
}

export async function createOrg(
	userId: string,
	record: Omit<InferInsertModel<typeof tables.org>, 'id'>
): Promise<tables.Org | null> {
	const result = await db.transaction(async (tx) => {
		const names = await db
			.insert(tables.owner_identifier)
			.values({ name: record.name })
			.returning();

		if (names.length === 0) {
			tx.rollback();
		}

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

export async function getOrgInvitesForUserId(invitedUserId: string, orgId: string | null = null) {
	const result = await db
		.select({
			...getTableColumns(tables.orgInvite),
			org: tables.org
		})
		.from(tables.orgInvite)
		.innerJoin(tables.org, eq(tables.org.id, tables.orgInvite.orgId))
		.where(
			and(
				eq(tables.orgInvite.userId, invitedUserId),

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
		.innerJoin(tables.user, eq(tables.user.id, tables.orgInvite.userId))
		.where(
			and(
				// hasn't interacted
				and(isNull(tables.orgInvite.rejectedAt), isNull(tables.orgInvite.acceptedAt)),

				eq(lower(tables.org.name), orgName.toLowerCase())
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

		if (invUpdate.length === 0) {
			tx.rollback();
			return false;
		}

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

		const orgId = res[0].orgId;

		const members = await tx
			.select()
			.from(tables.orgMember)
			.where(eq(tables.orgMember.orgId, orgId));

		const [subRes, orgRes] = await Promise.all([
			tx
				.update(tables.subscription)
				.set({ members: members.length })
				.where(eq(tables.subscription.referenceId, orgId))
				.returning(),
			tx
				.update(tables.org)
				.set({ memberCount: members.length })
				.where(eq(tables.org.id, orgId))
				.returning()
		]);

		if (subRes.length === 0 || orgRes.length === 0) {
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
	/** When true any registry the user can view will be shown
	 *
	 * @default true */
	readonlyAccess: boolean;
	/** User that owns the scope */
	ownedById: string;
};

export type RegistryDetails = tables.Registry & {
	scope: tables.Scope;
	org: tables.Org | null;
	latestVersion: tables.Version | null;
	monthlyFetches: number;
	releasedBy: tables.User | null;
	connectedStripeAccount: tables.User | null;
};

export async function searchRegistries({
	q,
	org,
	scope,
	limit,
	offset,
	userId,
	orderBy,
	lang,
	readonlyAccess = true,
	ownedById
}: Partial<RegistrySearchOptions>): Promise<{ total: number; data: RegistryDetails[] }> {
	const thirtyDaysAgo = new Date(Date.now() - DAY * 30).toISOString().slice(0, 10);

	const releasedBy = aliasedTable(tables.user, 'released_by');
	const orgSubscription = aliasedTable(tables.subscription, 'org_subscription');
	const billPayerSubscription = aliasedTable(tables.subscription, 'bill_payer_subscription');
	const connectedStripeAccount = aliasedTable(tables.user, 'linked_stripe_account');

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
		org ? eq(lower(tables.org.name), org.toLowerCase()) : undefined,
		scope ? eq(lower(tables.scope.name), scope.toLowerCase()) : undefined,
		ownedById ? eq(tables.scope.userId, ownedById) : undefined,
		lang ? eq(tables.registry.metaPrimaryLanguage, lang) : undefined,
		checkAccessQuery({
			orgSubscription,
			billPayerSubscription,
			checkSubscription: true,
			readonlyAccess
		}),

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
			score: scoreExpr,
			releasedBy: releasedBy,
			connectedStripeAccount: connectedStripeAccount
		})
		.from(tables.registry)
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(
			connectedStripeAccount,
			eq(connectedStripeAccount.stripeSellerAccountId, tables.registry.stripeConnectAccountId)
		)
		.leftJoin(
			tables.orgMember,
			and(eq(tables.orgMember.orgId, tables.org.id), eq(tables.orgMember.userId, userId ?? ''))
		)
		.leftJoin(
			tables.version,
			and(eq(tables.version.registryId, tables.registry.id), eq(tables.version.tag, 'latest'))
		)
		.leftJoin(releasedBy, eq(releasedBy.id, tables.version.releasedById))
		.leftJoin(
			tables.dailyRegistryFetch,
			and(
				eq(tables.dailyRegistryFetch.registryId, tables.registry.id),
				eq(tables.dailyRegistryFetch.fileName, 'jsrepo-manifest.json'),
				gte(tables.dailyRegistryFetch.day, thirtyDaysAgo)
			)
		)
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(
			tables.subscription,
			and(
				eq(tables.subscription.referenceId, tables.user.id),
				eq(tables.subscription.status, 'active')
			)
		)
		.leftJoin(
			orgSubscription,
			and(eq(orgSubscription.referenceId, tables.org.id), eq(orgSubscription.status, 'active'))
		)
		.leftJoin(
			billPayerSubscription,
			and(
				eq(billPayerSubscription.stripeCustomerId, orgSubscription.stripeCustomerId),
				notLike(billPayerSubscription.referenceId, 'org_%'),
				eq(billPayerSubscription.plan, 'pro'),
				eq(billPayerSubscription.status, 'active')
			)
		)
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
			tables.version.createdAt,
			tables.version.releasedById,
			releasedBy.id,
			connectedStripeAccount.id
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
		.leftJoin(
			orgSubscription,
			and(eq(orgSubscription.referenceId, tables.org.id), eq(orgSubscription.status, 'active'))
		)
		.leftJoin(
			billPayerSubscription,
			and(
				eq(billPayerSubscription.stripeCustomerId, orgSubscription.stripeCustomerId),
				notLike(billPayerSubscription.referenceId, 'org_%'),
				eq(billPayerSubscription.plan, 'pro'),
				eq(billPayerSubscription.status, 'active')
			)
		)
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
		.where(eq(lower(tables.org.name), orgName.toLowerCase()));

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
}): Promise<number | null> {
	const result = await db
		.select({
			registryId: tables.registry.id,
			downloads: sum(tables.dailyRegistryFetch.count)
		})
		.from(tables.registry)
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.leftJoin(
			tables.dailyRegistryFetch,
			and(
				eq(tables.dailyRegistryFetch.registryId, tables.registry.id),
				eq(tables.dailyRegistryFetch.fileName, 'jsrepo-manifest.json'),
				gte(tables.dailyRegistryFetch.day, from.toISOString().slice(0, 10))
			)
		)
		.where(
			and(
				eq(lower(tables.scope.name), scope.toLowerCase()),
				eq(lower(tables.registry.name), registryName.toLowerCase()),
				eq(tables.registry.access, 'public')
			)
		)
		.groupBy(tables.registry.id);

	if (result[0].registryId === null) return null;

	return parseInt(result[0].downloads ?? '0');
}

export async function startCourtesyMonth(orgId: string) {
	const start = new Date();
	const end = new Date(start.valueOf() + DAY * 30);

	const result = await db
		.update(tables.org)
		.set({ courtesyMonthStartedAt: start, courtesyMonthEndedAt: end })
		.where(and(eq(tables.org.id, orgId), isNull(tables.org.courtesyMonthEndedAt)))
		.returning();

	return result.length > 0;
}

export async function createAnonSession(hardwareId: string): Promise<tables.AnonSession | null> {
	const sessions = await db
		.insert(tables.anonSession)
		.values({ id: nanoid(), hardwareId, expires: new Date(Date.now() + 15 * MINUTE) })
		.returning();

	if (sessions.length === 0) return null;

	return sessions[0];
}

export async function getAnonSession(id: string): Promise<tables.AnonSession | null> {
	const sessions = await db.select().from(tables.anonSession).where(eq(tables.anonSession.id, id));

	if (sessions.length === 0) return null;

	return sessions[0];
}

export async function createAnonSessionCode(user: User, anonSessionId: string) {
	return await db.transaction(async (tx) => {
		const code = customAlphabet('1234567890', 6)();
		const codeHash = crypto.hash(code);

		// ensure session isn't expired and it hasn't been authorized
		const sessions = await tx
			.select()
			.from(tables.anonSession)
			.where(
				and(
					eq(tables.anonSession.id, anonSessionId),
					gt(tables.anonSession.expires, new Date()),
					isNull(tables.anonSession.authorizedToUserId)
				)
			);

		if (sessions.length === 0) return false;

		// revoke old codes
		await tx
			.delete(tables.anonSessionCode)
			.where(
				and(
					eq(tables.anonSessionCode.anonSessionId, anonSessionId),
					eq(tables.anonSessionCode.userId, user.id)
				)
			);

		const codes = await tx
			.insert(tables.anonSessionCode)
			.values({
				anonSessionId,
				userId: user.id,
				codeHash
			})
			.returning();

		if (codes.length === 0) {
			tx.rollback();
		}

		const result = await resend.emails.send({
			from: SUPPORT_EMAIL,
			to: [user.email],
			subject: 'Device Authorization Code',
			text: `Your jsrepo.com device authorization code is ${code}`
		});

		if (result.error !== null) {
			tx.rollback();
		}

		return true;
	});
}

export async function hasAnonSessionCode(userId: string, sessionId: string): Promise<boolean> {
	const codes = await db
		.select()
		.from(tables.anonSessionCode)
		.where(
			and(
				eq(tables.anonSessionCode.anonSessionId, sessionId),
				eq(tables.anonSessionCode.userId, userId)
			)
		);

	if (codes.length === 0) return false;

	return true;
}

export async function getAnonSessionCodes(
	userId: string,
	sessionId: string
): Promise<tables.AnonSessionCode[]> {
	return await db
		.select()
		.from(tables.anonSessionCode)
		.where(
			and(
				eq(tables.anonSessionCode.userId, userId),
				eq(tables.anonSessionCode.anonSessionId, sessionId)
			)
		);
}

export async function useAnonSessionCode(
	code: tables.AnonSessionCode,
	headers: Headers
): Promise<tables.APIKey | null> {
	return await db.transaction(async (tx) => {
		// update the session so it can't be used again
		const sessions = await tx
			.update(tables.anonSession)
			.set({ authorizedToUserId: code.userId })
			.where(
				and(
					eq(tables.anonSession.id, code.anonSessionId),

					// if this session is already authorized then we can't re-auth
					isNull(tables.anonSession.authorizedToUserId)
				)
			)
			.returning();

		if (sessions.length === 0) {
			return null;
		}

		const session = sessions[0];

		let keyId = '';
		let tempKey = '';

		try {
			const { id, key } = await auth.api.createApiKey({
				body: {
					permissions: {
						registries: ['publish']
					},
					userId: code.userId
				},
				headers: headers
			});

			keyId = id;
			tempKey = key;
		} catch {
			tx.rollback();
		}

		const apiKeys = await tx
			.update(tables.apikey)
			.set({
				deviceHardwareId: session.hardwareId,
				deviceSessionId: session.id,
				deviceActivated: false,
				mustBeActivatedBefore: new Date(Date.now() + MINUTE),
				enabled: false,
				deviceTempApiKey: tempKey
			})
			.where(eq(tables.apikey.id, keyId))
			.returning();

		if (apiKeys.length === 0) {
			tx.rollback();
		}

		return apiKeys[0];
	});
}

export async function activateKey(sessionId: string, hardwareId: string): Promise<string | null> {
	const keys = await db
		.select()
		.from(tables.apikey)
		.where(
			and(
				eq(tables.apikey.deviceSessionId, sessionId),
				eq(tables.apikey.deviceActivated, false),
				eq(tables.apikey.deviceHardwareId, hardwareId),
				gt(tables.apikey.mustBeActivatedBefore, new Date())
			)
		);

	if (keys.length === 0) return null;

	const key = keys[0];

	await db
		.update(tables.apikey)
		.set({ deviceActivated: true, enabled: true, deviceTempApiKey: null })
		.where(eq(tables.apikey.id, key.id));

	return key.deviceTempApiKey;
}

export async function getUserOrOrg(name: string) {
	const result = await db
		.select({ user: tables.user, org: tables.org })
		.from(tables.owner_identifier)
		.leftJoin(tables.user, eq(tables.user.username, tables.owner_identifier.name))
		.leftJoin(tables.org, eq(tables.org.name, tables.owner_identifier.name))
		.where(eq(tables.owner_identifier.name, name));

	if (result.length === 0 || (result[0].user === null && result[0].org === null)) {
		return null;
	}

	return result[0];
}

export async function updateUsername(
	userId: string,
	username: string,
	oldUsername?: string
): Promise<boolean> {
	return await db.transaction(async (tx) => {
		if (oldUsername !== undefined) {
			const result = await tx
				.delete(tables.owner_identifier)
				.where(eq(tables.owner_identifier.name, oldUsername))
				.returning();

			if (result.length === 0) {
				tx.rollback();
			}
		}

		const names = await tx.insert(tables.owner_identifier).values({ name: username }).returning();

		if (names.length === 0) {
			tx.rollback();
		}

		const user = await tx
			.update(tables.user)
			.set({ username })
			.where(eq(tables.user.id, userId))
			.returning();

		if (user.length === 0) {
			tx.rollback();
		}

		return true;
	});
}

export async function getUserMemberOrgs(userId: string) {
	const orgs = await db
		.select({
			...getTableColumns(tables.org)
		})
		.from(tables.org)
		.innerJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.where(eq(tables.orgMember.userId, userId));

	return orgs;
}

export async function updateUserConnectAccountId(userId: string, accountId: string) {
	const result = await db
		.update(tables.user)
		.set({ stripeSellerAccountId: accountId })
		.where(eq(tables.user.id, userId))
		.returning();

	return result.length > 0;
}

export async function createMarketPurchase(
	record: Omit<InferInsertModel<typeof tables.marketplacePurchase>, 'id'>
) {
	const result = await db
		.insert(tables.marketplacePurchase)
		.values({ id: generateId(), ...record })
		.returning();

	if (result.length === 0) return null;

	return result[0];
}

export async function getRegistryPrices({ scopeName, name }: { scopeName: string; name: string }) {
	return await db
		.select({ ...getTableColumns(tables.registryPrice) })
		.from(tables.registryPrice)
		.innerJoin(tables.registry, eq(tables.registry.id, tables.registryPrice.registryId))
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.where(and(eq(tables.scope.name, scopeName), eq(tables.registry.name, name)));
}

export async function getRegistryPrice(id: number) {
	const result = await db
		.select({
			...getTableColumns(tables.registryPrice),
			registry: tables.registry,
			scope: tables.scope
		})
		.from(tables.registryPrice)
		.innerJoin(tables.registry, eq(tables.registry.id, tables.registryPrice.registryId))
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.where(eq(tables.registryPrice.id, id));

	if (result.length === 0) return null;

	return result[0];
}

export async function referenceIdCanPurchase(
	id: string,
	registryId: number
): Promise<{ canPurchase: boolean; user?: tables.User; org?: tables.Org } | null> {
	if (id.startsWith('org_')) {
		const orgId = id;

		const orgs = await db
			.select()
			.from(tables.org)
			.leftJoin(
				tables.marketplacePurchase,
				and(
					eq(tables.marketplacePurchase.registryId, registryId),
					eq(tables.marketplacePurchase.referenceId, orgId)
				)
			)
			.where(eq(tables.org.id, orgId));

		if (orgs.length === 0) return null;

		const org = orgs[0];

		// can only purchase if we haven't before
		return { canPurchase: org.marketplace_purchase === null, org: org.org };
	} else {
		const userId = id;

		const users = await db
			.select()
			.from(tables.user)
			.leftJoin(
				tables.marketplacePurchase,
				and(
					eq(tables.marketplacePurchase.registryId, registryId),
					eq(tables.marketplacePurchase.referenceId, userId)
				)
			)
			.where(eq(tables.user.id, userId));

		if (users.length === 0) return null;

		const user = users[0];

		// can only purchase if we haven't before
		return { canPurchase: user.marketplace_purchase === null, user: user.user };
	}
}

export async function getMyLicenses(userId: string) {
	const licenses = await db
		.select({
			...getTableColumns(tables.marketplacePurchase),
			registry: tables.registry,
			scope: tables.scope,
			org: tables.org
		})
		.from(tables.marketplacePurchase)
		.innerJoin(tables.registry, eq(tables.registry.id, tables.marketplacePurchase.registryId))
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.leftJoin(tables.org, eq(tables.org.id, tables.marketplacePurchase.referenceId))
		.leftJoin(
			tables.orgMember,
			and(eq(tables.orgMember.orgId, tables.org.id), eq(tables.orgMember.userId, userId))
		)
		.innerJoin(
			tables.user,
			or(
				eq(tables.user.id, tables.marketplacePurchase.referenceId),
				eq(tables.user.id, tables.orgMember.userId),
				eq(tables.user.id, userId)
			)
		);

	return licenses;
}

export async function deleteMarketPurchase(paymentIntentId: string) {
	const result = await db
		.delete(tables.marketplacePurchase)
		.where(eq(tables.marketplacePurchase.stripePurchaseIntentId, paymentIntentId))
		.returning();

	if (result.length === 0) return false;

	return true;
}

export async function linkAccountToRegistry(registryId: number, accountId: string) {
	const result = await db
		.update(tables.registry)
		.set({ stripeConnectAccountId: accountId })
		.where(eq(tables.registry.id, registryId))
		.returning();

	if (result.length === 0) return false;

	return true;
}

export async function unlinkAccountFromRegistry(registryId: number) {
	const result = await db
		.update(tables.registry)
		.set({ stripeConnectAccountId: null })
		.where(eq(tables.registry.id, registryId))
		.returning();

	if (result.length === 0) return false;

	return true;
}
