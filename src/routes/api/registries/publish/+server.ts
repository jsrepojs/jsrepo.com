import { auth } from '$lib/auth.js';
import {
	canPublishToScope,
	createFiles,
	createRegistry,
	createVersion,
	getRegistry,
	getScope,
	getTags
} from '$lib/backend/db/functions.js';
import { db } from '$lib/backend/db/index.js';
import { postHogClient } from '$lib/ts/posthog.js';
import { manifestSchema, type Manifest } from '$lib/ts/registry/manifest.js';
import { NAME_REGEX } from '$lib/ts/registry/name.js';
import { extract, streamToBuffer } from '$lib/ts/tarz';
import { error, json } from '@sveltejs/kit';
import assert from 'node:assert';
import * as v from 'valibot';
import semver from 'semver'

export async function POST({ request }) {
	const apiKey = request.headers.get('x-api-key');

	if (apiKey === null) {
		error(401, 'generate an api key to publish to the jsrepo.com registry');
	}

	const verifyResult = await auth.api.verifyApiKey({
		body: {
			key: apiKey,
			permissions: {
				packages: ['publish']
			}
		}
	});

	if (!verifyResult.valid) {
		let status = 401;

		if (verifyResult.error?.code === "RATE_LIMITED" || verifyResult.error?.code === "USAGE_EXCEEDED") {
			status = 429;
		}

		error(status, verifyResult.error?.message ?? 'error validating api key');
	}

	assert(verifyResult.key !== null);

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

	// const versionTag = 

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

	if (!canPublishToScope(verifyResult.key.userId, scope)) {
		error(401, `you don't have permission to publish to the scope \`@${scopeName}\``);
	}

	let registryId = (await getRegistry(scopeName, registryName))?.id ?? null;

	const result = await db.transaction(async (tx) => {
		if (registryId === null) {
			// create registry

			registryId = await createRegistry(tx, {
				name: registryName,
				scopeId: scope.id,
				private: manifest.private
			});

			if (registryId === null) {
				return tx.rollback();
			}
		} else {
			// if the registry exists we need to check and see if the same tag has already been published
			const tags = await getTags(scopeName, registryName);

			// version has already been published
			// this shouldn't be null unless we fail in the middle of a transaction
			if (tags?.find((t) => t === manifest.version)) {
				error(400, `cannot publish over an existing version ${manifest.version}`);
			}
		}

		// create version

		const versionId = await createVersion(tx, { registryId, version: manifest.version });

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

	postHogClient.capture({
		event: 'publish-registry',
		distinctId: verifyResult.key.userId,
		properties: {
			scope: scopeName,
			registry: registryName,
			version: manifest.version
		}
	});

	return json({});
}
