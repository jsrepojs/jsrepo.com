import { eq, getTableColumns, isNotNull, isNull, or, TablesRelationalConfig } from 'drizzle-orm';
import * as tables from './src/lib/backend/db/schema';
import { drizzle, PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';
import color from 'chalk';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import pLimit, { LimitFunction } from 'p-limit';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { StopWatch } from './src/lib/ts/stopwatch';
import { formatDuration } from './src/lib/ts/time';
import { PassThrough, Readable } from 'stream';
import { streamToBuffer } from './src/lib/ts/tarz.js';
import tar from 'tar-stream';
import { Upload } from '@aws-sdk/lib-storage';
import { createGzip } from 'zlib';

// initial setup

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
	getRegistryTarballKey: ({
		scope,
		registry,
		version
	}: {
		scope: string;
		registry: string;
		version: string;
	}) => {
		return `registries/@${scope}/${registry}/v/${version}.tgz`;
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
const db = drizzle(client);

type tx = PgTransaction<PostgresJsQueryResultHKT, Record<string, never>, TablesRelationalConfig>;

const logger = (prefix?: string) => {
	return {
		info: (msg: string) => console.info(`${color.green(`[${prefix}]`)} ${msg}`)
	};
};

async function migrateToTgz(tx: tx) {
	const s = new StopWatch();

	s.start();

	const versions = await tx
		.select({ ...getTableColumns(tables.version), registry: tables.registry, scope: tables.scope })
		.from(tables.version)
		.innerJoin(tables.registry, eq(tables.registry.id, tables.version.registryId))
		.innerJoin(tables.scope, eq(tables.scope.id, tables.registry.scopeId))
		.where(or(isNull(tables.version.tarball), isNotNull(tables.version.tag)));

	const limit = pLimit(20);

	await Promise.all(versions.map((v) => limit(() => migrateVersion(v, { tx, limit }))));

	console.log(
		`✅ Completed migration of ${versions.length} version(s) in ${formatDuration(s.elapsed())}.`
	);
}

async function migrateVersion(
	version: tables.Version & { registry: tables.Registry; scope: tables.Scope },
	{ tx, limit }: { tx: tx; limit: LimitFunction }
) {
	const name = `@${version.scope.name}/${version.registry.name}@${version.version}`;

	const log = logger(name);

	log.info(`🛜 Fetching files...`);

	const partialFiles = await tx
		.select()
		.from(tables.file)
		.where(eq(tables.file.versionId, version.id));

	log.info(`📦 Packaging ${partialFiles.length} files...`);

	const pack = tar.pack();

	await Promise.all(
		partialFiles.map(async (f) =>
			limit(async () => {
				log.info(`📦 Packaging ${f.name}...`);

				const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: f.storageKey });

				const s3Response = await storage.client.send(cmd);

				const stream = Readable.toWeb(s3Response.Body as Readable);

				const content = (await streamToBuffer(stream as never)).toString();

				pack.entry({ name: f.name }, content).end();

				log.info(`✅ Packaged ${f.name}.`);
			})
		)
	);

	pack.finalize();

	log.info(`✅ Finished packaging ${partialFiles.length} files.`);

	const gzip = createGzip();

	const tarGzStream = new PassThrough();
	pack.pipe(gzip).pipe(tarGzStream);

	const uploadingKeys: string[] = [];

	const versionKey = storage.getRegistryTarballKey({
		scope: version.scope.name,
		registry: version.registry.name,
		version: version.version
	});

	uploadingKeys.push(versionKey);

	if (version.tag) {
		const tagKey = storage.getRegistryTarballKey({
			scope: version.scope.name,
			registry: version.registry.name,
			version: version.tag
		});

		uploadingKeys.push(tagKey);
	}

	log.info(`🛜 Uploading ${uploadingKeys.join(', and ')} to R2...`);

	// Upload to S3
	await Promise.all(
		uploadingKeys.map(async (key) => {
			const upload = new Upload({
				client: s3Client,
				params: {
					Bucket: BUCKET,
					Key: key,
					Body: tarGzStream,
					ContentType: 'application/x-tar'
				}
			});

			await upload.done();
		})
	);

	log.info(`✅ Uploaded ${uploadingKeys.join(', and ')} to R2.`);

	await tx
		.update(tables.version)
		.set({ tarball: versionKey })
		.where(eq(tables.version.id, version.id));
}

await db.transaction(migrateToTgz);

process.exit(1);
