import { auth } from '$lib/auth.js';
import {
	canPublishToScope,
	nameIsBanned,
	createFiles,
	createRegistry,
	createVersion,
	getRegistry,
	getScope,
	getUser,
	getVersions
} from '$lib/backend/db/functions.js';
import { db } from '$lib/backend/db/index.js';
import { posthog } from '$lib/ts/posthog.js';
import { manifestSchema, validateAndScore, type Manifest } from '$lib/ts/registry/manifest.js';
import { NAME_REGEX } from '$lib/ts/registry/name.js';
import { extract, streamToBuffer } from '$lib/ts/tarz';
import { error, json } from '@sveltejs/kit';
import assert from 'node:assert';
import * as v from 'valibot';
import semver from 'semver';
import { getPreReleaseTag } from '$lib/ts/versioning.js';
import type { Version } from '$lib/backend/db/schema.js';
import { marketplaceNextStepsEmail, newVersionPublishedEmail, resend } from '$lib/ts/resend.js';
import * as tables from '$lib/backend/db/schema.js';
import { eq } from 'drizzle-orm';
import { waitUntil } from '@vercel/functions';
import { determinePrimaryLanguage } from '$lib/ts/registry/index.js';
import { displaySize, MEGABYTE } from '$lib/ts/sizes.js';
import type { CreateEmailOptions } from 'resend';

const MAX_FILE_SIZE = MEGABYTE / 8;

export async function POST({ request }) {
	const apiKey = request.headers.get('x-api-key');
	const dryRun = request.headers.get('x-dry-run') === '1';

	if (apiKey === null) {
		error(401, 'generate an api key to publish to the jsrepo.com registry');
	}

	const verifyResult = await auth.api.verifyApiKey({
		body: {
			key: apiKey,
			permissions: {
				registries: ['publish']
			}
		}
	});

	if (!verifyResult.valid) {
		let status = 401;

		if (
			verifyResult.error?.code === 'RATE_LIMITED' ||
			verifyResult.error?.code === 'USAGE_EXCEEDED'
		) {
			status = 429;
		}

		error(status, verifyResult.error?.message ?? 'error validating api key');
	}

	assert(verifyResult.key !== null);

	const userPromise = getUser({ id: verifyResult.key.userId });

	if (request.body === null) {
		error(400, 'body is required');
	}

	if (request.headers.get('content-type') !== 'application/gzip') {
		error(400, 'invalid content-type expected `application/gzip`');
	}

	const files = (await extract(await streamToBuffer(request.body))).match(
		(val) => val,
		(err) => error(500, `error extracting files ${err}`)
	);

	for (const file of files) {
		const byteLength = new TextEncoder().encode(file.content).length;

		if (byteLength > MAX_FILE_SIZE) {
			error(
				400,
				`${file.name} exceeds ${displaySize(MAX_FILE_SIZE)} in size! If this limitation is a problem for your application please reach out at https://jsrepo.com/help`
			);
		}
	}

	const manifestFile = files.find((f) => f.name === 'jsrepo-manifest.json');

	if (!manifestFile) {
		error(400, 'could not find your jsrepo-manifest.json');
	}

	let manifest: Manifest;

	try {
		manifest = v.parse(manifestSchema, JSON.parse(manifestFile.content));
	} catch (err) {
		error(400, `error parsing manifest ${err}`);
	}

	// eslint-disable-next-line prefer-const
	let [scopeName, registryName] = manifest.name.split('/');

	if (!scopeName.startsWith('@')) {
		error(400, `invalid scope '${scopeName}' scopes must start with '@'`);
	}

	if (!registryName.match(NAME_REGEX)) {
		error(400, `invalid name for registry ${registryName}`);
	}

	if (!semver.valid(manifest.version)) {
		error(400, `invalid version ${manifest.version} is not semver compatible`);
	}

	const access = manifest.access ?? 'public';

	const hasReadme = files.find((f) => f.name === 'README.md') !== undefined;

	validateAndScore(manifest, hasReadme).match(
		(v) => v,
		(err) => error(400, err)
	);

	let releaseTag = getPreReleaseTag(manifest.version);

	// trim @ character
	scopeName = scopeName.slice(1);

	// verify that user actually has access to this scope
	const scope = await getScope(scopeName);

	if (scope === null) {
		error(
			400,
			`you will need to claim the scope \`@${scopeName}\` on jsrepo.com before you can publish to it`
		);
	}

	const user = await userPromise;

	assert(user !== null, 'User should be defined!');

	const canPublishResult = await canPublishToScope(user, scope, access);

	if (!canPublishResult.canPublish) {
		error(
			401,
			`you don't have permission to publish to the scope \`@${scopeName}\` because ${canPublishResult?.reason}`
		);
	}

	const registry = await getRegistry(scopeName, registryName, user.id);

	let registryId = registry?.id ?? null;

	if (registryId === null) {
		// ensure name is not banned only check on first time publish if we missed it that's on us
		if (await nameIsBanned(registryName)) {
			error(400, `We'd appreciate if you didn't use ${registryName} as the name of your registry.`);
		}
	}

	if (dryRun) {
		// check if the version exists
		if (registryId !== null) {
			const versions = await getVersions(scopeName, registryName);

			if (versions && versions.find((v) => v.version === manifest.version)) {
				error(400, `cannot publish over an existing version ${manifest.version}`);
			}
		}

		return json({ status: 'dry-run' });
	}

	const primaryLanguage = determinePrimaryLanguage(...manifest.categories.flatMap((c) => c.blocks));

	const result = await db.transaction(async (tx) => {
		let oldTaggedVersion: Version | null = null;
		let latestVersion: Version | null = null;
		let isLatest = releaseTag === null;

		if (registryId === null) {
			// create registry
			registryId = await createRegistry(tx, {
				name: registryName,
				scopeId: scope.id,
				access,
				metaAuthors: manifest.meta?.authors ?? null,
				metaBugs: manifest.meta?.bugs ?? null,
				metaDescription: manifest.meta?.description ?? null,
				metaHomepage: manifest.meta?.homepage ?? null,
				metaRepository: manifest.meta?.repository ?? null,
				metaTags: manifest.meta?.tags ?? null,
				metaPrimaryLanguage: primaryLanguage
			});

			if (registryId === null) {
				return tx.rollback();
			}
		} else {
			// if the registry exists we need to check and see if the same tag has already been published
			const versions = await getVersions(scopeName, registryName);

			if (versions) {
				for (const version of versions) {
					if (version.tag === releaseTag) {
						// we only add the prerelease tag to the latest prerelease
						if (semver.gt(version.version, manifest.version)) {
							releaseTag = null;
						}

						oldTaggedVersion = version;
					}

					if (version.tag === 'latest') {
						latestVersion = version;
					}

					if (version.version === manifest.version) {
						error(400, `cannot publish over an existing version ${manifest.version}`);
					}

					// if there is a version higher than the current version don't apply latest tag
					if (semver.gt(version.version, manifest.version)) {
						isLatest = false;
					}
				}
			}

			// update metadata
			const result = await tx
				.update(tables.registry)
				.set({
					metaAuthors: manifest.meta?.authors ?? null,
					metaBugs: manifest.meta?.bugs ?? null,
					metaDescription: manifest.meta?.description ?? null,
					metaHomepage: manifest.meta?.homepage ?? null,
					metaRepository: manifest.meta?.repository ?? null,
					metaTags: manifest.meta?.tags ? Array.from(new Set(manifest.meta?.tags)) : null,
					metaPrimaryLanguage: primaryLanguage
				})
				.where(eq(tables.registry.id, registryId))
				.returning({ id: tables.registry.id });

			if (result.length === 0) {
				return tx.rollback();
			}
		}

		if (isLatest) {
			releaseTag = 'latest';
			oldTaggedVersion = latestVersion;
		}

		// create version

		const versionId = await createVersion(
			tx,
			{
				registryId,
				version: manifest.version,
				tag: releaseTag,
				hasReadme,
				releasedById: verifyResult.key?.userId ?? '' // we asserted this to be defined earlier
			},
			oldTaggedVersion?.id
		);

		if (versionId === null) {
			return tx.rollback();
		}

		// add files

		const fileIds = await createFiles(tx, versionId, files);

		if (fileIds === null) {
			return tx.rollback();
		}

		return true;
	});

	if (!result) {
		error(500, 'error publishing to jsrepo.com');
	}

	posthog.capture({
		event: 'publish-registry',
		distinctId: verifyResult.key.userId,
		properties: {
			email: user.email,
			username: user.username,
			scope: scopeName,
			registry: registryName,
			version: manifest.version,
			access
		}
	});

	waitUntil(posthog.shutdown());

	const emails: CreateEmailOptions[] = [];

	emails.push(newVersionPublishedEmail(user, manifest.name, manifest.version));

	if (registry === null) {
		emails.push(marketplaceNextStepsEmail(user, `@${scopeName}/${registryName}`));
	}

	await Promise.all([emails.map((email) => resend.emails.send(email))]);

	return json({
		status: 'published',
		scope: scopeName,
		registry: registryName,
		version: manifest.version,
		tag: releaseTag,
		access
	});
}
