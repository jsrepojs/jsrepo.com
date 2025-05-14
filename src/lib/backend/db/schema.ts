import { SQL, sql, type InferSelectModel } from 'drizzle-orm';
import {
	pgTable,
	text,
	timestamp,
	boolean,
	varchar,
	serial,
	unique,
	integer,
	pgEnum,
	index,
	date,
	type AnyPgColumn,
	uniqueIndex
} from 'drizzle-orm/pg-core';

export function lower(column: AnyPgColumn): SQL {
	return sql`lower(${column})`;
}

// Auth Schema

export const user = pgTable(
	'user',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		email: text('email').notNull().unique(),
		username: varchar('username', { length: 50 })
			.unique()
			.references(() => owner_identifier.name, { onUpdate: 'cascade' }),
		emailVerified: boolean('email_verified').notNull(),
		image: text('image'),
		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at').notNull(),
		scopeLimit: integer().notNull().default(5),
		role: text('role').notNull().default('user'),
		banned: boolean('banned').notNull().default(false),
		barReason: text('bar_reason'),
		banExpires: timestamp('bar_expires'),
		stripeCustomerId: text('stripe_customer_id')
	},
	(table) => {
		return [
			index('user_email_idx').on(table.email),
			index('user_username_idx').on(table.username),
			index('user_stripe_customer_id_idx').on(table.stripeCustomerId)
		];
	}
).enableRLS();

export type User = InferSelectModel<typeof user>;

export const owner_identifier = pgTable('owner_identifier', {
	name: varchar('name', { length: 50 }).primaryKey()
}).enableRLS();

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at').notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		impersonatedBy: text('impersonated_by').references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => {
		return [
			index('session_user_id_idx').on(table.userId),
			index('session_token_idx').on(table.token)
		];
	}
).enableRLS();

export type Session = InferSelectModel<typeof session>;

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at').notNull()
	},
	(table) => {
		return [index('account_user_id_idx').on(table.userId)];
	}
).enableRLS();

export type Account = InferSelectModel<typeof account>;

export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at'),
		updatedAt: timestamp('updated_at')
	},
	(table) => {
		return [index('verification_identifier_idx').on(table.identifier)];
	}
).enableRLS();

export type Verification = InferSelectModel<typeof verification>;

export const apikey = pgTable(
	'apikey',
	{
		id: text('id').primaryKey(),
		name: text('name'),
		start: text('start'),
		prefix: text('prefix'),
		key: text('key').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		refillInterval: integer('refill_interval'),
		refillAmount: integer('refill_amount'),
		lastRefillAt: timestamp('last_refill_at'),
		enabled: boolean('enabled'),
		rateLimitEnabled: boolean('rate_limit_enabled'),
		rateLimitTimeWindow: integer('rate_limit_time_window'),
		rateLimitMax: integer('rate_limit_max'),
		requestCount: integer('request_count'),
		remaining: integer('remaining'),
		lastRequest: timestamp('last_request'),
		expiresAt: timestamp('expires_at'),
		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at').notNull(),
		permissions: text('permissions'),
		metadata: text('metadata'),
		deviceHardwareId: text('device_hardware_id'),
		deviceSessionId: text('device_session_id'),
		deviceActivated: boolean('device_activated'),
		mustBeActivatedBefore: timestamp('must_be_activated_before'),
		deviceTempApiKey: text('device_temp_api_key')
	},
	(table) => {
		return [
			index('apikey_key_idx').on(table.key),
			index('apikey_device_session_id_idx').on(table.deviceSessionId),
			index('apikey_device_hardware_id_idx').on(table.deviceHardwareId)
		];
	}
).enableRLS();

export type APIKey = InferSelectModel<typeof apikey>;

export const anonSession = pgTable('anon_session', {
	id: text('id').primaryKey(),
	hardwareId: text('hardware_id').notNull(),
	// expires in 5 minutes
	expires: timestamp('expires').notNull(),
	authorizedToUserId: text('authorized_to_user_id').references(() => user.id, {
		onDelete: 'cascade'
	})
}).enableRLS();

export type AnonSession = InferSelectModel<typeof anonSession>;

export const anonSessionCode = pgTable(
	'anon_session_code',
	{
		id: serial('id').primaryKey(),
		anonSessionId: text('anon_session_id')
			.notNull()
			.references(() => anonSession.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		codeHash: text('code_hash').notNull()
	},
	(table) => {
		return [
			index('anon_session_code_session_id_idx').on(table.anonSessionId),
			index('anon_session_code_user_id_idx').on(table.userId)
		];
	}
).enableRLS();

export type AnonSessionCode = InferSelectModel<typeof anonSessionCode>;

export const subscription = pgTable(
	'subscription',
	{
		id: text('id').primaryKey(),
		plan: text('plan').notNull(),
		referenceId: text('reference_id').notNull(),
		stripeCustomerId: text('stripe_customer_id'),
		stripeSubscriptionId: text('stripe_subscription_id'),
		status: text('status'),
		periodStart: timestamp('period_start'),
		periodEnd: timestamp('period_end'),
		cancelAtPeriodEnd: boolean('cancel_at_period_end'),
		seats: integer('seats'),
		// this needs to be kept in sync with the org
		members: integer('org_members'),
		hasEnoughSeats: boolean('has_enough_seats')
			.generatedAlwaysAs(
				(): SQL => sql`COALESCE(${subscription.seats} >= (${subscription.members} - 1), false)`
			)
			.notNull()
	},
	(table) => {
		return [
			index('subscription_reference_id_idx').on(table.referenceId),
			index('subscription_customer_id_idx').on(table.stripeCustomerId),
			index('subscription_subscription_id_idx').on(table.stripeSubscriptionId),
			index('subscription_plan_idx').on(table.plan)
		];
	}
).enableRLS();

export type Subscription = InferSelectModel<typeof subscription>;

// ---

export const org = pgTable(
	'org',
	{
		id: text('id').primaryKey(),
		name: varchar('name', { length: 50 })
			.notNull()
			.unique()
			.references(() => owner_identifier.name, { onUpdate: 'cascade' }),
		description: text('description'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		courtesyMonthStartedAt: timestamp('courtesy_month_started_at'),
		courtesyMonthEndedAt: timestamp('courtesy_month_ended_at'),
		memberCount: integer('members').notNull().default(1)
	},
	(table) => {
		return [
			uniqueIndex('org_name_idx').on(lower(table.name)),
			index('org_courtesy_month_ended_at_idx').on(table.courtesyMonthEndedAt)
		];
	}
).enableRLS();

export type Org = InferSelectModel<typeof org>;

export const orgMemberRole = pgEnum('org_roll', ['member', 'publisher', 'owner']);

export type OrgRole = (typeof orgMemberRole.enumValues)[number];

export const orgMemberRoles = orgMemberRole.enumValues;

export const orgMember = pgTable(
	'org_members',
	{
		id: serial('id').primaryKey(),
		orgId: text('org_id')
			.notNull()
			.references(() => org.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: orgMemberRole('role').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => {
		return [
			index('org_member_org_id_idx').on(table.orgId),
			index('org_member_user_id_idx').on(table.userId),
			index('org_member_role_idx').on(table.role)
		];
	}
).enableRLS();

export type OrgMember = InferSelectModel<typeof orgMember>;

export const orgInvite = pgTable(
	'org_invites',
	{
		id: serial('id').primaryKey(),
		orgId: text('org_id')
			.notNull()
			.references(() => org.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: orgMemberRole().notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		acceptedAt: timestamp('accepted_at'),
		rejectedAt: timestamp('rejected_at')
	},
	(table) => {
		return [
			index('org_invites_user_id_idx').on(table.userId),
			index('org_invites_org_id_idx').on(table.orgId)
		];
	}
).enableRLS();

export type OrgInvite = InferSelectModel<typeof orgInvite>;

export const scope = pgTable(
	'scope',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 20 }).notNull(),
		orgId: text('org_id').references(() => org.id, { onDelete: 'cascade' }),
		userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		claimedAt: timestamp('claimed_at').notNull().defaultNow()
	},
	(table) => {
		return [
			sql`CONSTRAINT not_null_owner CHECK (${table.orgId} IS NOT NULL OR ${table.userId} IS NOT NULL)`,
			uniqueIndex('scope_name_idx').on(lower(table.name)),
			index('scope_org_id_idx').on(table.orgId),
			index('scope_user_id_idx').on(table.userId)
		];
	}
).enableRLS();

export type Scope = InferSelectModel<typeof scope>;

export const scopeTransferRequest = pgTable(
	'scope_transfer_request',
	{
		id: serial('id').primaryKey(),
		scopeId: integer('scope_id')
			.notNull()
			.references(() => scope.id, { onDelete: 'cascade' }),
		newOrgId: text('new_org_id').references(() => org.id, { onDelete: 'cascade' }),
		newUserId: text('new_user_id').references(() => user.id, { onDelete: 'cascade' }),
		oldOrgId: text('old_org_id').references(() => org.id, { onDelete: 'cascade' }),
		oldUserId: text('old_user_id').references(() => user.id, { onDelete: 'cascade' }),
		createdById: text('created_by_id').references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		acceptedAt: timestamp('accepted_at'),
		rejectedAt: timestamp('rejected_at')
	},
	(table) => {
		return [
			sql`CONSTRAINT not_null_new_owner CHECK (${table.newOrgId} IS NOT NULL OR ${table.newUserId} IS NOT NULL)`,
			sql`CONSTRAINT not_null_old_owner CHECK (${table.oldOrgId} IS NOT NULL OR ${table.oldUserId} IS NOT NULL)`,
			index('scope_transfer_request_created_by_id_idx').on(table.createdById),
			index('scope_transfer_request_scope_id_idx').on(table.scopeId),
			index('scope_transfer_request_accepted_at_idx').on(table.acceptedAt)
		];
	}
).enableRLS();

export type ScopeTransferRequest = InferSelectModel<typeof scopeTransferRequest>;

export const registry_access = pgEnum('registry_access', ['public', 'private', 'marketplace']);

export type RegistryAccess = (typeof registry_access.enumValues)[number];

export const registryAccessLevels = registry_access.enumValues;

export const registry = pgTable(
	'registry',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 20 }).notNull(),
		access: registry_access().notNull(),
		scopeId: integer('scope_id')
			.notNull()
			.references(() => scope.id, { onDelete: 'cascade' }),

		// metadata fields created on publish
		metaAuthors: text('meta_authors').array(),
		metaBugs: text('meta_bugs'),
		metaDescription: text('meta_description'),
		metaHomepage: text('meta_homepage'),
		metaRepository: text('meta_repository'),
		metaTags: text('meta_tags').array(),
		metaPrimaryLanguage: text('meta_primary_language').notNull(),

		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => {
		return [
			uniqueIndex('registry_scope_name_unique_idx').on(table.scopeId, lower(table.name)),
			index('registry_name_idx').on(lower(table.name)),
			index('registry_access_idx').on(table.access),
			index('registry_meta_description').on(table.metaDescription),
			index('registry_meta_tags').on(table.metaTags),
			index('registry_meta_authors').on(table.metaAuthors),
			index('registry_meta_primary_language').on(table.metaPrimaryLanguage)
		];
	}
).enableRLS();

export type Registry = InferSelectModel<typeof registry>;

export const version = pgTable(
	'version',
	{
		id: serial('id').primaryKey(),
		registryId: integer('registry_id')
			.notNull()
			.references(() => registry.id, { onDelete: 'cascade' }),
		version: text('version').notNull(),
		tag: text('tag'),
		releasedById: text('released_by_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		hasReadme: boolean('has_readme').notNull().default(false),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => {
		return [
			unique().on(table.registryId, table.version),
			unique().on(table.registryId, table.tag),
			index('version_registry_id_idx').on(table.registryId),
			index('version_version_idx').on(table.version),
			index('version_tag_idx').on(table.tag)
		];
	}
).enableRLS();

export type Version = InferSelectModel<typeof version>;

export const file = pgTable(
	'file',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull(),
		versionId: integer('version_id')
			.notNull()
			.references(() => version.id, { onDelete: 'cascade' }),
		storageKey: text('storage_key').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => {
		return [
			index('file_name_idx').on(table.name),
			index('file_version_id_idx').on(table.versionId)
		];
	}
).enableRLS();

export type File = InferSelectModel<typeof file>;

export const commonNameBan = pgTable(
	'common_name_ban',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull()
	},
	(table) => {
		return [index('common_name_ban_name_idx').on(table.name)];
	}
).enableRLS();

export type CommonNameBan = InferSelectModel<typeof commonNameBan>;

export const dailyRegistryFetch = pgTable(
	'daily_registry_fetch',
	{
		id: serial('id').primaryKey(),
		scopeId: integer('scope_id')
			.notNull()
			.references(() => scope.id, { onDelete: 'cascade' }),
		registryId: integer('registry_id')
			.notNull()
			.references(() => registry.id, { onDelete: 'cascade' }),
		versionId: integer('version_id')
			.notNull()
			.references(() => version.id, { onDelete: 'cascade' }),
		// scopeName: varchar('scope_name', { length: 20 })
		// 	.notNull()
		// 	.references(() => scope.name, { onDelete: 'cascade' }),
		// registryName: varchar('registry_name', { length: 20 }).notNull(),
		// version: text('version').notNull(),
		fileName: text('file_name').notNull(),
		count: integer('count').notNull(),
		day: date('day').notNull()
	},
	(table) => {
		return [
			index('daily_registry_fetch_scope_id_idx').on(table.scopeId),
			index('daily_registry_fetch_registry_id_idx').on(table.registryId),
			index('daily_registry_fetch_version_id_idx').on(table.versionId),
			// index('daily_registry_fetch_scope_name_idx').on(table.scopeName),
			// index('daily_registry_fetch_registry_name_idx').on(table.registryName),
			// index('daily_registry_fetch_version_idx').on(table.version),
			index('daily_registry_fetch_file_name_idx').on(table.fileName),
			index('daily_registry_fetch_count_idx').on(table.count),
			index('daily_registry_fetch_day_idx').on(table.day),
			unique().on(table.scopeId, table.registryId, table.versionId, table.fileName, table.day)
			// unique().on(table.scopeName, table.registryName, table.version, table.fileName, table.day),
		];
	}
).enableRLS();

export type DailyRegistryFetch = InferSelectModel<typeof dailyRegistryFetch>;
