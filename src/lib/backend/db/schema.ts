import { sql, type InferSelectModel } from 'drizzle-orm';
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
	index
} from 'drizzle-orm/pg-core';

// Auth Schema

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	scopeLimit: integer().notNull().default(5),
	polarCustomerId: text('polar_customer_id'),
	polarSubscriptionPlanId: text('polar_subscription_plan_id'),
	polarSubscriptionPlanEnd: timestamp('polar_subscription_plan_end')
}).enableRLS();

export type User = InferSelectModel<typeof user>;

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
}).enableRLS();

export type Session = InferSelectModel<typeof session>;

export const account = pgTable('account', {
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
}).enableRLS();

export type Account = InferSelectModel<typeof account>;

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
}).enableRLS();

export type Verification = InferSelectModel<typeof verification>;

export const apikey = pgTable('apikey', {
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
	metadata: text('metadata')
}).enableRLS();

export type APIKey = InferSelectModel<typeof apikey>;

// ---

export const org = pgTable(
	'org',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 20 }).notNull().unique(),
		description: text('description'),
		ownerId: text('owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => {
		return [index('org_name_idx').on(table.name), index('org_owner_id_idx').on(table.ownerId)];
	}
).enableRLS();

export type Org = InferSelectModel<typeof org>;

export const org_member_role = pgEnum('role', ['member', 'publisher']);

export const org_member = pgTable(
	'org_members',
	{
		id: serial('id').primaryKey(),
		orgId: integer('org_id')
			.notNull()
			.references(() => org.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		role: org_member_role().notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => {
		return [
			index('org_member_org_id_idx').on(table.orgId),
			index('org_member_user_id_idx').on(table.userId)
		];
	}
).enableRLS();

export type OrgMember = InferSelectModel<typeof org_member>;

export const scope = pgTable(
	'scope',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 20 }).notNull().unique(),
		orgId: integer('org_id').references(() => org.id, { onDelete: 'cascade' }),
		userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		claimedAt: timestamp('claimed_at').notNull().defaultNow()
	},
	(table) => {
		return [
			sql`CONSTRAINT not_null_owner CHECK (${table.orgId} IS NOT NULL OR ${table.userId} IS NOT NULL)`,
			index('scope_name_idx').on(table.name),
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
		newOrgId: integer('new_org_id').references(() => org.id, { onDelete: 'cascade' }),
		newUserId: text('new_user_id').references(() => user.id, { onDelete: 'cascade' }),
		oldOrgId: integer('old_org_id').references(() => org.id, { onDelete: 'cascade' }),
		oldUserId: text('old_user_id').references(() => user.id, { onDelete: 'cascade' }),
		createdById: text('created_by_id').references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		acceptedAt: timestamp('accepted_at')
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

export const registry = pgTable(
	'registry',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 20 }).notNull().unique(),
		private: boolean().notNull().default(false),
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

		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => {
		return [
			index('registry_name_idx').on(table.name),
			index('registry_private_idx').on(table.private),
			index('registry_meta_description').on(table.metaDescription),
			index('registry_meta_tags').on(table.metaTags),
			index('registry_meta_authors').on(table.metaAuthors)
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
		content: text('content').notNull(),
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
