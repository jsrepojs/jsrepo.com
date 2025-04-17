import { sql, type InferSelectModel } from 'drizzle-orm';
import {
	pgTable,
	text,
	timestamp,
	boolean,
	varchar,
	serial,
	unique,
	integer
} from 'drizzle-orm/pg-core';

/* Auth Schema */

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull()
});

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
});

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
});

export type Account = InferSelectModel<typeof account>;

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export type Verification = InferSelectModel<typeof verification>;

// ---

export const org = pgTable('org', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 25 }).notNull().unique(),
	description: text('description'),
	ownerId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export type Org = InferSelectModel<typeof org>;

export const scope = pgTable(
	'scope',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 25 }).notNull().unique(),
		orgId: integer('org_id').references(() => org.id, { onDelete: 'cascade' }),
		userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => {
		return [
			sql`CONSTRAINT not_null_owner CHECK (${table.orgId} IS NOT NULL OR ${table.userId} IS NOT NULL)`
		];
	}
);

export type Scope = InferSelectModel<typeof scope>;

export const registry = pgTable('registry', {
	id: serial('id').primaryKey(),
	name: varchar('name').notNull().unique(),
	private: boolean().notNull().default(false),
	scope_id: integer('scope_id')
		.notNull()
		.references(() => scope.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export type Registry = InferSelectModel<typeof registry>;

export const version = pgTable(
	'version',
	{
		id: serial('id').primaryKey(),
		registryId: integer('registry_id')
			.notNull()
			.references(() => registry.id, { onDelete: 'cascade' }),
		tag: text('tag').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(table) => [unique().on(table.registryId, table.tag)]
);

export type Version = InferSelectModel<typeof version>;

export const file = pgTable('file', {
	id: serial('id').primaryKey(),
	// We only need version.id since it's aware of the registry.id
	versionId: integer('version_id')
		.notNull()
		.references(() => version.id, { onDelete: 'cascade' }),
	content: text('content').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export type File = InferSelectModel<typeof file>;
