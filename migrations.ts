import { eq, isNull } from 'drizzle-orm';
import * as tables from './src/lib/backend/db/schema.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import color from 'chalk';
// import { S3Client } from '@aws-sdk/client-s3';

// initial setup

// const BUCKET = process.env.PUBLIC_STORAGE_BUCKET!;
// const BUCKET_URL = process.env.STORAGE_BUCKET_URL!;

// const s3Client = new S3Client({
// 	region: 'auto',
// 	endpoint: BUCKET_URL,
// 	credentials: {
// 		accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
// 		secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!
// 	}
// });

// const storage = {
// 	client: s3Client,
// 	getStorageUrl: (key: string) => {
// 		return new URL(key, BUCKET_URL).toString();
// 	},
// 	getRegistryTarballKey: ({
// 		scope,
// 		registry,
// 		version
// 	}: {
// 		scope: string;
// 		registry: string;
// 		version: string;
// 	}) => {
// 		return `registries/@${scope}/${registry}/v/${version}.tgz`;
// 	},
// 	getRegistryFileKey: ({
// 		scope,
// 		registry,
// 		version,
// 		fileName
// 	}: {
// 		scope: string;
// 		registry: string;
// 		version: string;
// 		fileName: string;
// 	}) => {
// 		return `registries/@${scope}/${registry}/v/${version}/files/${fileName}`;
// 	}
// };

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client);

const logger = (prefix?: string) => {
	return {
		info: (msg: string) => console.info(`${color.green(`[${prefix}]`)} ${msg}`)
	};
};

async function registryScopeNameMigration() {
	const log = logger('registry scope migration');

	const result = await db.transaction(async (tx) => {
		const registries = await tx
			.select()
			.from(tables.registry)
			.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
			.where(isNull(tables.registry.scopeName));

		if (registries.length === 0) return 0;

		for (const registry of registries) {
			log.info(`Migrating ${color.cyan(`@${registry.registry.name}/${registry.scope.name}`)}`);

			const res = await tx
				.update(tables.registry)
				.set({ scopeName: registry.scope.name })
				.where(eq(tables.registry.id, registry.registry.id))
				.returning();

			if (res.length === 0) {
				tx.rollback();
				return;
			}

			log.info(`✅ Migrated ${color.cyan(`@${registry.registry.name}/${registry.scope.name}`)}`);
		}

		return registries.length;
	});

	log.info(`✅ Migrated ${result} registries`);
}

await registryScopeNameMigration();

process.exit(1);
