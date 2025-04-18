import { and, eq, type TablesRelationalConfig } from 'drizzle-orm';
import { db } from '.';
import * as tables from './schema';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';

export async function canPublishToScope(userId: string, scope: tables.Scope): Promise<boolean> {
	if (scope.userId === userId) return true;

	// scope is owned by a user but not you, sorry
	if (scope.orgId === null) return true;

	const members = await getOrgMemberIds(scope.orgId);

	const member = members.get(userId);

	if (!member) return false;

	if (member !== 'publisher') return false;

	return true;
}

export async function getScope(scope: string): Promise<tables.Scope | null> {
	const scopes = await db.select().from(tables.scope).where(eq(tables.scope.name, scope));

	return scopes[0] ?? null;
}

export async function getOrgMemberIds(
	orgId: number
): Promise<Map<string, tables.OrgMember['role']>> {
	const orgMembers = await db
		.select()
		.from(tables.org)
		.leftJoin(tables.org_member, eq(tables.org.id, tables.org_member.orgId))
		.where(eq(tables.org.id, orgId));

	const members = new Map<string, tables.OrgMember['role']>();

	orgMembers.map((member, i) => {
		if (i === 0) {
			members.set(member.org.ownerId, 'publisher');
		}

		if (member.org_members) {
			members.set(member.org_members.userId, member.org_members.role);
		}
	});

	return members;
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
		.innerJoin(tables.registry, eq(tables.scope.id, tables.registry.id))
		.where(and(eq(tables.scope.name, scopeName), eq(tables.registry.name, registryName)));

	if (registries.length === 0) return null;

	return registries[0];
}

export async function getTags(scopeName: string, registryName: string): Promise<string[] | null> {
	const versions = await db
		.select({ version: tables.version.version })
		.from(tables.scope)
		.innerJoin(tables.registry, eq(tables.scope.id, tables.registry.id))
		.innerJoin(tables.version, eq(tables.registry.id, tables.version.id))
		.where(and(eq(tables.scope.name, scopeName), eq(tables.registry.name, registryName)));

	if (versions.length === 0) return null;

	return versions.map((v) => v.version);
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
	record: { registryId: number; version: string }
): Promise<number | null> {
	const result = await tx
		.insert(tables.version)
		.values(record)
		.returning({ id: tables.version.id });

	if (result.length === 0) return null;

	return result[0].id;
}

export async function getApiKey(name: string): Promise<tables.APIKey | null> {
	const apiKeys = await db.select().from(tables.apikey).where(eq(tables.apikey.name, name));

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

// export async function getFile(scope: string, name: string, version: string, fileName: string) {
// 	if (version === "latest") {
		
// 	}
// }