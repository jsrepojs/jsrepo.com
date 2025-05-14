// Uploads files to R2 using the content column and fills the storageKey column with the correct key
// This should be run again once we merge this PR and can be deleted in the long term

import { eq, getTableColumns, isNotNull, isNull, or, TablesRelationalConfig } from 'drizzle-orm';
import * as tables from './src/lib/backend/db/schema';
import { drizzle, PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';
import color from 'chalk';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import pLimit from 'p-limit';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { StopWatch } from './src/lib/ts/stopwatch';
import { formatDuration } from './src/lib/ts/time';

const BUCKET = process.env.PUBLIC_STORAGE_BUCKET!;
const BUCKET_URL = process.env.STORAGE_BUCKET_URL!;

const s3Client = new S3Client({
	region: 'auto',
	endpoint: BUCKET_URL,
	credentials: {
		accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
		secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!
	}
});

const storage = {
	client: s3Client,
	getStorageUrl: (key: string) => {
		return new URL(key, BUCKET_URL).toString();
	},
	getRegistryFileKey: ({
		scope,
		registry,
		version,
		fileName
	}: {
		scope: string;
		registry: string;
		version: string;
		fileName: string;
	}) => {
		return `registries/@${scope}/${registry}/v/${version}/files/${fileName}`;
	}
};

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client);

const limit = pLimit(20);

await db.transaction(async (tx) => {
	const files = await tx
		.select({
			...getTableColumns(tables.file),
			version: tables.version,
			registry: tables.registry,
			scope: tables.scope
		})
		.from(tables.file)
		.innerJoin(tables.version, eq(tables.file.versionId, tables.version.id))
		.innerJoin(tables.registry, eq(tables.registry.id, tables.version.registryId))
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.where(
			or(
				isNull(tables.file.storageKey),

				// always update tagged versions since they can change
				isNotNull(tables.version.tag)
			)
		);

	const s = new StopWatch();

	s.start();

	const updatedFiles = await Promise.all(files.map((f) => limit(() => uploadAndUpdateFile(tx, f))));

	s.stop();

	console.log(`🎉 Updated ${updatedFiles.length} files in ${formatDuration(s.elapsed())}!`);
});

process.exit(0);

type tx = PgTransaction<PostgresJsQueryResultHKT, Record<string, never>, TablesRelationalConfig>;

async function uploadAndUpdateFile(
	tx: tx,
	file: tables.File & { scope: tables.Scope; registry: tables.Registry; version: tables.Version }
) {
	let newFile: tables.File = file;

	if (file.storageKey === null) {
		const key = storage.getRegistryFileKey({
			scope: file.scope.name,
			registry: file.registry.name,
			version: file.version.version,
			fileName: file.name
		});

		console.log(`⬆️ Uploading ${color.cyan(key)} to ${color.bold('R2')}...`);

		await storage.client.send(
			new PutObjectCommand({
				Key: key,
				Bucket: BUCKET,
				Body: file.content
			})
		);

		console.log(`✅ Uploaded ${color.cyan(key)} to ${color.bold('R2')}.`);

		const result = await tx
			.update(tables.file)
			.set({ storageKey: key })
			.where(eq(tables.file.id, file.id))
			.returning();

		if (result.length === 0) {
			tx.rollback();
		}

		newFile = result[0];
	}

	if (file.version.tag) {
		const tagKey = storage.getRegistryFileKey({
			scope: file.scope.name,
			registry: file.registry.name,
			version: file.version.tag,
			fileName: file.name
		});

		console.log(`⬆️ Uploading ${color.cyan(tagKey)} to ${color.bold('R2')}...`);

		await storage.client.send(
			new PutObjectCommand({
				Key: tagKey,
				Bucket: BUCKET,
				Body: file.content
			})
		);

		console.log(`✅ Uploaded ${color.cyan(tagKey)} to ${color.bold('R2')}.`);
	}

	return newFile;
}
