import { getSessionCookie } from 'better-auth/cookies';
import { getFileContentsFast, postFileFetch } from '$lib/backend/db/functions.js';
import { error, text } from '@sveltejs/kit';
import { waitUntil } from '@vercel/functions';
import { isTag } from '$lib/ts/versioning.js';
import { base64Url } from '@better-auth/utils/base64';
import { createHash } from '@better-auth/utils/hash';
import { storage } from '$lib/backend/s3/index.js';
import Stream from 'node:stream';
import { extractSpecific } from '$lib/ts/tarz.js';
import { dev } from '$app/environment';

/** The max age of a public cached asset in seconds */
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function GET({ params, request, getClientAddress }) {
	// eslint-disable-next-line prefer-const
	let { scope, name, version, fileName } = params;

	const scopeName = scope.slice(1);

	const cookie = getSessionCookie(request.headers);

	const sessionToken = cookie?.split('.')[0] ?? null;
	let apiKey = request.headers.get('x-api-key');

	if (apiKey !== null) {
		const hash = await createHash('SHA-256').digest(new TextEncoder().encode(apiKey));
		const hashed = base64Url.encode(new Uint8Array(hash), {
			padding: false
		});

		apiKey = hashed;
	}

	const storageKey = storage.getRegistryTarballKey({
		scope: scopeName,
		registry: name,
		version
	});

	const [accessResult, s3Response] = await Promise.all([
		getFileContentsFast({
			scopeName,
			registryName: name,
			version,
			fileName,
			sessionToken,
			apiKey
		}),
		storage.getObject(storageKey)
	]);

	if (accessResult === null) {
		error(404);
	}

	if (s3Response === null || !s3Response.Body) error(404, 'File not found');

	waitUntil(
		postFileFetch({
			distinctId: getClientAddress(),
			scopeName,
			registryName: name,
			registryVersion: version,
			fileName
		})
	);

	const headers = new Headers();

	// never cache in dev
	if (!dev) {
		// never cache tags or non public registries
		if (accessResult.access === 'public' && !isTag(version)) {
			headers.append('cache-control', `max-age=${MAX_AGE}, immutable, public`);
		}
	}

	const [file] = await extractSpecific(s3Response.Body as Stream, fileName);

	return text(file.content, { headers });
}
