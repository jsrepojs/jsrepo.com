import { getSessionCookie } from 'better-auth/cookies';
import { getFileContentsTheHardWay, postFileFetch } from '$lib/backend/db/functions.js';
import { error, text } from '@sveltejs/kit';
import { waitUntil } from '@vercel/functions';
import { isTag } from '$lib/ts/versioning.js';
import { base64Url } from '@better-auth/utils/base64';
import { createHash } from '@better-auth/utils/hash';

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

	const result = await getFileContentsTheHardWay({
		scopeName,
		registryName: name,
		version,
		fileName,
		sessionToken,
		apiKey
	});

	if (result === null) {
		error(404);
	}

	waitUntil(
		postFileFetch({
			distinctId: getClientAddress(),
			scopeName,
			registryName: name,
			registryVersion: version,
			fileName
		})
	);

	// never cache tags
	if (result.private || isTag(version)) {
		return text(result.content);
	}

	// caching
	// we only cache public registries. A public registry is forever public and cannot be changed to be private.

	return text(result.content, {
		headers: { 'cache-control': `max-age=${MAX_AGE}, immutable, public` }
	});
}
