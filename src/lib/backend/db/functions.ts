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
	arrayContains
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
import { lower } from './schema';
import { customAlphabet, nanoid } from 'nanoid';
import * as crypto from '$lib/ts/crypto';
import { resend, SUPPORT_EMAIL } from '$lib/ts/resend';
import { auth } from '$lib/auth';
import { PUBLIC_STORAGE_BUCKET } from '$env/static/public';
import { storage } from '../s3';
import { consume, extractSpecific } from '$lib/ts/tarz';
import Stream, { PassThrough } from 'stream';
import * as array from '$lib/ts/array';
import type { Pack } from 'tar-stream';
import { createGzip } from 'zlib';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export type tx = PgTransaction<
	PostgresJsQueryResultHKT,
	Record<string, never>,
	TablesRelationalConfig
>;

export type FullOrg = tables.Org & {
	members: (tables.OrgMember & { user: tables.User })[];
};

export async function canPublishToScope(
	user: User,
	scope: tables.Scope
): Promise<{ canPublish: boolean; reason?: string }> {
	if (scope.userId === user.id) {
		return { canPublish: true };
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
}: GetUserOptions): Promise<tables.User | null> {
	const result = await db
		.select()
		.from(tables.user)
		.where(
			and(
				id ? eq(tables.user.id, id) : undefined,
				email ? eq(tables.user.email, email) : undefined,
				username ? eq(lower(tables.user.username), username.toLowerCase()) : undefined
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
	const linkedStripeAccount = aliasedTable(tables.user, 'linked_stripe_account');
	const userOrgMember = aliasedTable(tables.orgMember, 'user_org_member');

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
			userOrgMember,

			and(
				// user is the org member
				eq(userOrgMember.userId, tables.user.id)
			)
		)
		.leftJoin(
			tables.marketplacePurchase,
			and(
				eq(tables.marketplacePurchase.registryId, tables.registry.id),

				or(
					// purchase for org
					eq(tables.marketplacePurchase.referenceId, userOrgMember.orgId),

					// purchase for user
					eq(tables.marketplacePurchase.referenceId, tables.user.id)
				)
			)
		)
		.leftJoin(
			linkedStripeAccount,
			eq(linkedStripeAccount.stripeSellerAccountId, tables.registry.stripeConnectAccountId)
		)
		.where(
			and(
				registryId
					? eq(tables.registry.id, registryId)
					: and(
							eq(lower(tables.scope.name), scopeName!.toLowerCase()),
							eq(lower(tables.registry.name), registryName!.toLowerCase())
						),

				checkAccessQuery({ userOrgMember, readonlyAccess: true })
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
			...getTableColumns(tables.version)
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
	const userOrgMember = aliasedTable(tables.orgMember, 'user_org_member');

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
		.leftJoin(
			userOrgMember,

			and(
				// user is the org member
				eq(userOrgMember.userId, tables.user.id)
			)
		)
		.leftJoin(
			tables.marketplacePurchase,
			and(
				eq(tables.marketplacePurchase.registryId, tables.registry.id),

				or(
					// purchase for org
					eq(tables.marketplacePurchase.referenceId, userOrgMember.orgId),

					// purchase for user
					eq(tables.marketplacePurchase.referenceId, tables.user.id)
				)
			)
		)
		.where(
			and(
				eq(lower(tables.scope.name), scopeName.toLowerCase()),
				eq(lower(tables.registry.name), registryName.toLowerCase()),
				eq(isTag ? tables.version.tag : tables.version.version, version),

				userId !== undefined ? checkAccessQuery({ userOrgMember, readonlyAccess: true }) : undefined
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
		tarball: string;
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

export async function uploadArchive({
	scope,
	registry,
	version,
	tag,
	pack
}: {
	scope: string;
	registry: string;
	version: string;
	tag: string | null;
	pack: Pack;
}): Promise<string> {
	const gzip = createGzip();

	const tarGzStream = new PassThrough();
	pack.pipe(gzip).pipe(tarGzStream);

	const consumed = await consume(tarGzStream);

	const uploadingKeys: string[] = [];

	const versionKey = storage.getRegistryTarballKey({
		scope: scope,
		registry: registry,
		version: version
	});

	uploadingKeys.push(versionKey);

	// we upload a second archive to overwrite the tag
	if (tag) {
		const tagKey = storage.getRegistryTarballKey({
			scope: scope,
			registry: registry,
			version: tag
		});

		uploadingKeys.push(tagKey);
	}

	// Upload to S3
	await Promise.all(
		uploadingKeys.map(async (key) => {
			const cmd = new PutObjectCommand({
				Bucket: PUBLIC_STORAGE_BUCKET,
				Key: key,
				Body: consumed
			});

			await storage.client.send(cmd);
		})
	);

	return versionKey;
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
	sessionToken,
	apiKey
}: Omit<GetFileContentsFastOptions, 'userId'> & {
	sessionToken: string | null;
	apiKey: string | null;
}): Promise<{ access: tables.RegistryAccess } | null> {
	const isTag = !semver.valid(version);

	const userOrgMember = aliasedTable(tables.orgMember, 'user_org_member');

	const result = await db
		.select({
			access: tables.registry.access
		})
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.innerJoin(tables.registry, eq(tables.scope.id, tables.registry.scopeId))
		.innerJoin(tables.version, eq(tables.registry.id, tables.version.registryId))
		.leftJoin(
			tables.apikey,
			and(eq(tables.apikey.key, apiKey ?? ''), eq(tables.apikey.enabled, true))
		)
		.leftJoin(tables.session, eq(tables.session.token, sessionToken ?? ''))
		.leftJoin(
			tables.user,
			or(eq(tables.user.id, tables.session.userId), eq(tables.user.id, tables.apikey.userId))
		)
		.leftJoin(
			userOrgMember,

			and(
				// user is the org member
				eq(userOrgMember.userId, tables.user.id)
			)
		)
		.leftJoin(
			tables.marketplacePurchase,
			and(
				eq(tables.marketplacePurchase.registryId, tables.registry.id),

				or(
					// purchase for org
					eq(tables.marketplacePurchase.referenceId, userOrgMember.orgId),

					// purchase for user
					eq(tables.marketplacePurchase.referenceId, tables.user.id)
				)
			)
		)
		.where(
			and(
				eq(lower(tables.scope.name), scopeName.toLowerCase()),
				eq(lower(tables.registry.name), registryName.toLowerCase()),
				eq(isTag ? tables.version.tag : tables.version.version, version),

				checkAccessQuery({ userOrgMember })
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
	/** Files to fetch. Leave this out if you want all files associated with this registry version */
	fileNames?: string[];
	/** Set this to true if you are not returning file contents */
	readonlyAccess?: boolean;
};

export async function getFiles({
	userId,
	scopeName,
	registryName,
	version,
	fileNames = [],
	readonlyAccess = false
}: GetFilesOptions): Promise<{ name: string; content: string }[]> {
	const isTag = !semver.valid(version);

	const userOrgMember = aliasedTable(tables.orgMember, 'user_org_member');

	const result = await db
		.select({
			tarball: tables.version.tarball
		})
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.innerJoin(tables.registry, eq(tables.scope.id, tables.registry.scopeId))
		.innerJoin(tables.version, eq(tables.registry.id, tables.version.registryId))
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
		.leftJoin(
			userOrgMember,

			and(
				// user is the org member
				eq(userOrgMember.userId, tables.user.id)
			)
		)
		.leftJoin(
			tables.marketplacePurchase,
			and(
				eq(tables.marketplacePurchase.registryId, tables.registry.id),

				or(
					// purchase for org
					eq(tables.marketplacePurchase.referenceId, userOrgMember.orgId),

					// purchase for user
					eq(tables.marketplacePurchase.referenceId, tables.user.id)
				)
			)
		)
		.where(
			and(
				eq(lower(tables.scope.name), scopeName.toLowerCase()),
				eq(lower(tables.registry.name), registryName.toLowerCase()),
				eq(isTag ? tables.version.tag : tables.version.version, version),

				checkAccessQuery({ userOrgMember, readonlyAccess })
			)
		);

	if (result.length === 0) return [];

	const tarballKey = result[0].tarball;

	const s3Response = await storage.getObject(tarballKey);

	if (s3Response === null) throw new Error(`Could not find file '${tarballKey}'`);

	const files = await extractSpecific(s3Response?.Body as Stream, ...fileNames);

	return files.flatMap((file) => {
		const og = fileNames.find((f) => f === file.name);

		if (!og) return [];

		return [{ name: og, content: file.content }];
	});
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
	const userOrgMember = aliasedTable(tables.orgMember, 'user_org_member');

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
		.leftJoin(
			userOrgMember,

			and(
				// user is the org member
				eq(userOrgMember.userId, tables.user.id)
			)
		)
		.leftJoin(
			tables.marketplacePurchase,
			and(
				eq(tables.marketplacePurchase.registryId, tables.registry.id),

				or(
					// purchase for org
					eq(tables.marketplacePurchase.referenceId, userOrgMember.orgId),

					// purchase for user
					eq(tables.marketplacePurchase.referenceId, tables.user.id)
				)
			)
		)
		.where(
			and(
				eq(lower(tables.scope.name), scopeName.toLowerCase()),

				// access check
				checkAccessQuery({ userOrgMember, readonlyAccess: true })
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
 * You need to join the following tables `tables.user`, `tables.scope`,
 * `tables.registry`, `tables.orgMember`, `tables.marketplacePurchase`.
 */
function checkAccessQuery({
	userOrgMember,
	readonlyAccess = false,
	hasSettingsAccess = false
}: {
	userOrgMember: typeof tables.orgMember;
	/** User can view the registry even if they don't have access to it.
	 * This is just for marketplace listing. This should only be used if `hasSettingsAccess` is false */
	readonlyAccess?: boolean;
	/** Readonly access means that a user can view the contents of the registry
	 * regardless of whether or not they are a part of its ownership */
	hasSettingsAccess?: boolean;
}) {
	if (!hasSettingsAccess) {
		return or(
			eq(tables.registry.access, 'public'),

			// access to view the registry
			readonlyAccess
				? // registry is willfully listed on the marketplace
					and(
						eq(tables.registry.access, 'marketplace'),
						eq(tables.registry.listOnMarketplace, true)
					)
				: undefined,

			or(
				// registry owners always have access
				or(
					// User owned scope
					and(
						isNotNull(tables.scope.userId),

						// check if we own the scope
						eq(tables.scope.userId, tables.user.id)
					),

					// Org owned scope
					and(
						isNotNull(tables.scope.orgId),

						// check if we are part of the organization
						eq(tables.orgMember.userId, tables.user.id)
					)
				),

				// rules for users that purchased from the marketplace
				and(
					eq(tables.registry.access, 'marketplace'),

					eq(tables.marketplacePurchase.registryId, tables.registry.id),
					eq(tables.marketplacePurchase.status, 'paid'),

					or(
						// owns the individual license
						eq(tables.user.id, tables.marketplacePurchase.referenceId),

						// is part of licensed org
						and(
							eq(userOrgMember.userId, tables.user.id),

							eq(userOrgMember.orgId, tables.marketplacePurchase.referenceId)
						)
					)
				)
			)
		);
	} else {
		// only grant access to the scope owner or org members regardless of the access level
		return or(
			// User owned scope
			and(
				isNotNull(tables.scope.userId),

				// check if we own the scope
				eq(tables.scope.userId, tables.user.id)
			),

			// Org owned scope
			and(
				isNotNull(tables.scope.orgId),

				// check if we are part of the organization
				eq(tables.orgMember.userId, tables.user.id)
			)
		);
	}
}

export async function getOrg({
	id,
	name
}: { id: string; name?: never } | { name: string; id?: never }): Promise<FullOrg | null> {
	const result: (tables.Org & {
		member: tables.OrgMember;
		user: tables.User;
	})[] = await db
		.select({
			...getTableColumns(tables.org),
			member: tables.orgMember,
			user: tables.user
		})
		.from(tables.org)
		.innerJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.innerJoin(tables.user, eq(tables.user.id, tables.orgMember.userId))
		.where(
			id === undefined ? eq(lower(tables.org.name), name.toLowerCase()) : eq(tables.org.id, id)
		);

	if (result.length === 0) return null;

	const org = result[0];
	const members = result.map((r) => ({ ...r.member, user: r.user }));

	return {
		...org,
		members
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
	const result = await db
		.select({
			id: tables.scope.id
		})
		.from(tables.scope)
		.leftJoin(tables.org, eq(tables.org.id, tables.scope.orgId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.leftJoin(tables.user, eq(tables.user.id, userId ?? ''))
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
						eq(tables.orgMember.userId, userId ?? '')
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

		const [subRes] = await Promise.all([
			tx
				.update(tables.org)
				.set({ memberCount: members.length })
				.where(eq(tables.org.id, orgId))
				.returning()
		]);

		if (subRes.length === 0) {
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
	keywords: string[];
	org: string | null;
	scope: string | null;
	lang: string | null;
	/** So users can see private registries they have access to */
	userId: string | null;
	offset: number | null;
	limit: number | null;
	orderBy: PgColumn | SQL | undefined | null;
	type: SQL | undefined | null;
	/** When true any registry the user can view will be shown
	 *
	 * @default true */
	hasSettingsAccess: boolean;
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
	keywords,
	org,
	scope,
	limit,
	offset,
	userId,
	orderBy,
	lang,
	hasSettingsAccess = false,
	ownedById,
	type: typeSql
}: Partial<RegistrySearchOptions>): Promise<{ total: number; data: RegistryDetails[] }> {
	const thirtyDaysAgo = new Date(Date.now() - DAY * 30).toISOString().slice(0, 10);

	const releasedBy = aliasedTable(tables.user, 'released_by');
	const userOrgMember = aliasedTable(tables.orgMember, 'user_org_member');
	const connectedStripeAccount = aliasedTable(tables.user, 'linked_stripe_account');

	const matchQuery = sql`(
		setweight(
			to_tsvector('english', ${tables.registry.name}),
			'A'
		) ||
		setweight(
			to_tsvector('english', ${tables.registry.scopeName}),
			'B'
		) ||
		setweight(
			to_tsvector('english', ${tables.registry.metaDescription}), 
			'C'
		) ||
		setweight(
			array_to_tsvector(${tables.registry.metaTags}),
			'D'
		)
	), websearch_to_tsquery('english', ${q})`;

	const whereClause = and(
		q
			? or(
					sql`(
		setweight(
			to_tsvector('english', ${tables.registry.name}),
			'A'
		) ||
		setweight(
			to_tsvector('english', ${tables.registry.scopeName}),
			'B'
		) ||
		setweight(
			to_tsvector('english', ${tables.registry.metaDescription}), 
			'C'
		) ||
		setweight(
			array_to_tsvector(${tables.registry.metaTags}),
			'D'
		)
	) @@ websearch_to_tsquery('english', ${q})`,
					sql`'@' || ${tables.registry.scopeName} || '/' || ${tables.registry.name} ilike ${`${q}%`}`
				)
			: undefined,
		keywords && keywords.length > 0 ? arrayContains(tables.registry.metaTags, keywords) : undefined,
		org ? eq(lower(tables.org.name), org.toLowerCase()) : undefined,
		scope ? eq(lower(tables.scope.name), scope.toLowerCase()) : undefined,
		ownedById ? eq(tables.scope.userId, ownedById) : undefined,
		lang ? eq(tables.registry.metaPrimaryLanguage, lang) : undefined,
		typeSql ? typeSql : undefined,
		checkAccessQuery({
			userOrgMember,
			readonlyAccess: true,
			hasSettingsAccess
		})
	);

	let dataQuery = db
		.select({
			...getTableColumns(tables.registry),
			scope: tables.scope,
			org: tables.org,
			latestVersion: tables.version,
			monthlyFetches: sum(tables.dailyRegistryFetch.count),
			rank: sql`ts_rank(${matchQuery})`,
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
			userOrgMember,

			and(
				// user is the org member
				eq(userOrgMember.userId, tables.user.id)
			)
		)
		.leftJoin(
			tables.marketplacePurchase,
			and(
				eq(tables.marketplacePurchase.registryId, tables.registry.id),

				or(
					// purchase for org
					eq(tables.marketplacePurchase.referenceId, userOrgMember.orgId),

					// purchase for user
					eq(tables.marketplacePurchase.referenceId, tables.user.id)
				)
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
		dataQuery = dataQuery.orderBy((t) => desc(t.rank));
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
		.leftJoin(
			userOrgMember,

			and(
				// user is the org member
				eq(userOrgMember.userId, tables.user.id)
			)
		)
		.leftJoin(
			tables.marketplacePurchase,
			and(
				eq(tables.marketplacePurchase.registryId, tables.registry.id),

				or(
					// purchase for org
					eq(tables.marketplacePurchase.referenceId, userOrgMember.orgId),

					// purchase for user
					eq(tables.marketplacePurchase.referenceId, tables.user.id)
				)
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
		.leftJoin(tables.user, eq(lower(tables.user.username), lower(tables.owner_identifier.name)))
		.leftJoin(tables.org, eq(lower(tables.org.name), lower(tables.owner_identifier.name)))
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
				.where(eq(lower(tables.owner_identifier.name), oldUsername.toLowerCase()))
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
		.where(
			and(
				eq(lower(tables.scope.name), scopeName.toLowerCase()),
				eq(lower(tables.registry.name), name.toLowerCase())
			)
		);
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
		.leftJoin(tables.org, eq(tables.org.id, tables.marketplacePurchase.referenceId))
		.leftJoin(tables.orgMember, eq(tables.orgMember.orgId, tables.org.id))
		.innerJoin(
			tables.user,
			or(
				eq(tables.user.id, tables.orgMember.userId),
				eq(tables.user.id, tables.marketplacePurchase.referenceId)
			)
		)
		.innerJoin(tables.registry, eq(tables.registry.id, tables.marketplacePurchase.registryId))
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.where(eq(tables.user.id, userId));

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

export async function getRegistryPurchases({
	id,
	scope,
	name
}: { scope?: never; name?: never; id: number } | { id?: never; scope: string; name: string }) {
	return await db
		.select({ ...getTableColumns(tables.marketplacePurchase) })
		.from(tables.marketplacePurchase)
		.innerJoin(tables.registry, eq(tables.registry.id, tables.marketplacePurchase.registryId))
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.where(
			and(
				id ? eq(tables.marketplacePurchase.registryId, id) : undefined,
				scope
					? and(
							eq(lower(tables.scope.name), scope.toLowerCase()),
							eq(lower(tables.registry.name), name.toLowerCase())
						)
					: undefined
			)
		);
}

export async function getRegistryPurchasesCount({
	id,
	scope,
	name
}:
	| { scope?: never; name?: never; id: number }
	| { id?: never; scope: string; name: string }): Promise<number> {
	const res = await db
		.select({ count: countDistinct(tables.marketplacePurchase.id) })
		.from(tables.marketplacePurchase)
		.innerJoin(tables.registry, eq(tables.registry.id, tables.marketplacePurchase.registryId))
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.where(
			and(
				id ? eq(tables.marketplacePurchase.registryId, id) : undefined,
				scope
					? and(
							eq(lower(tables.scope.name), scope.toLowerCase()),
							eq(lower(tables.registry.name), name.toLowerCase())
						)
					: undefined
			)
		);

	if (res.length === 0) return 0;

	return res[0].count;
}

export async function getReviews({
	scope,
	registry,
	offset = 0,
	limit = 20
}: {
	scope: string;
	registry: string;
	offset?: number;
	limit?: number;
}) {
	return await db
		.select({
			...getTableColumns(tables.registryReview),
			user: tables.user
		})
		.from(tables.registryReview)
		.innerJoin(tables.registry, eq(tables.registry.id, tables.registryReview.registryId))
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.innerJoin(tables.user, eq(tables.user.id, tables.registryReview.userId))
		.where(
			and(
				eq(lower(tables.scope.name), scope.toLowerCase()),
				eq(lower(tables.registry.name), registry.toLowerCase())
			)
		)
		.offset(offset)
		.limit(limit)
		.orderBy(desc(tables.registryReview.createdAt));
}

export type RegistryRatings = {
	overall: number;
	totalRatings: number;
	/** `ratings[0]` = 1 star ratings count */
	ratings: [number, number, number, number, number];
};

export async function getRegistryRatings({
	scope,
	registry
}: {
	registry: string;
	scope: string;
}): Promise<RegistryRatings> {
	const reviews = await db
		.select({
			...getTableColumns(tables.registryReview)
		})
		.from(tables.registryReview)
		.innerJoin(tables.registry, eq(tables.registry.id, tables.registryReview.registryId))
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.where(
			and(
				eq(lower(tables.scope.name), scope.toLowerCase()),
				eq(lower(tables.registry.name), registry.toLowerCase())
			)
		);

	const ratings: RegistryRatings['ratings'] = [0, 0, 0, 0, 0];

	reviews.map((r) => ratings[r.rating - 1]++);

	const overall = array.average(reviews, (r) => r.rating);

	return {
		overall,
		totalRatings: reviews.length,
		ratings
	};
}

/** Anyone can leave a review so long as they aren't the owner and haven't left a review before */
export async function canLeaveReview({
	userId,
	scope,
	registry
}: {
	userId: string | undefined;
	scope: string;
	registry: string;
}) {
	if (!userId) return false;

	const [previousReviews, isOwner] = await Promise.all([
		db
			.select({
				...getTableColumns(tables.registryReview)
			})
			.from(tables.registryReview)
			.innerJoin(tables.registry, eq(tables.registry.id, tables.registryReview.registryId))
			.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
			.where(
				and(
					eq(lower(tables.scope.name), scope.toLowerCase()),
					eq(lower(tables.registry.name), registry.toLowerCase()),
					eq(tables.registryReview.userId, userId)
				)
			),
		hasScopeAccess(userId, scope)
	]);

	if (isOwner) return false;

	return previousReviews.length === 0;
}

export async function leaveReview(record: InferInsertModel<typeof tables.registryReview>) {
	await db.transaction(async (tx) => {
		const result = await tx.insert(tables.registryReview).values(record).returning();

		if (result.length === 0) {
			tx.rollback();
		}

		const reviews = await tx
			.select()
			.from(tables.registryReview)
			.where(eq(tables.registryReview.registryId, record.registryId));

		const averageRating = (array.sum(reviews, (r) => r.rating) / reviews.length).toFixed(1);

		await tx
			.update(tables.registry)
			.set({ rating: parseFloat(averageRating) })
			.where(eq(tables.registry.id, record.registryId));
	});

	return true;
}
