import { getSessionCookie } from 'better-auth/cookies';
import { getFileContentsFast, postFileFetch } from '$lib/backend/db/functions.js';
import { error } from '@sveltejs/kit';
import { waitUntil } from '@vercel/functions';
import { isTag } from '$lib/ts/versioning.js';
import { base64Url } from '@better-auth/utils/base64';
import { createHash } from '@better-auth/utils/hash';
import { storage } from '$lib/backend/s3/index.js';
import { Readable } from 'node:stream';

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

	const storageKey = storage.getRegistryFileKey({
		scope: scopeName,
		registry: name,
		version,
		fileName
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

	const stream = Readable.toWeb(s3Response.Body as Readable);

	const headers = new Headers({
		'Content-Type': s3Response.ContentType ?? 'application/octet-stream'
	});

	if (s3Response.ContentLength) {
		headers.append('Content-Length', s3Response.ContentLength.toString());
	}

	if (s3Response.ContentDisposition) {
		headers.append('Content-Disposition', s3Response.ContentDisposition);
	}

	// never cache tags or non public registries
	if (accessResult.access === 'public' && !isTag(version)) {
		headers.append('cache-control', `max-age=${MAX_AGE}, immutable, public`);
	}

	return new Response(stream as never, { headers });
}

// slower solution that uses pre-signed urls

// import { getSessionCookie } from 'better-auth/cookies';
// import { getFileContentsFast, postFileFetch } from '$lib/backend/db/functions.js';
// import { error, redirect, text } from '@sveltejs/kit';
// import { waitUntil } from '@vercel/functions';
// import { isTag } from '$lib/ts/versioning.js';
// import { base64Url } from '@better-auth/utils/base64';
// import { createHash } from '@better-auth/utils/hash';
// import { storage } from '$lib/backend/s3/index.js';
// import { GetObjectCommand } from '@aws-sdk/client-s3';
// import { PUBLIC_STORAGE_BUCKET } from '$env/static/public';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// /** The max age of a public cached asset in seconds */
// const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// export async function GET({ params, request, getClientAddress }) {
// 	// eslint-disable-next-line prefer-const
// 	let { scope, name, version, fileName } = params;

// 	const scopeName = scope.slice(1);

// 	const cookie = getSessionCookie(request.headers);

// 	const sessionToken = cookie?.split('.')[0] ?? null;
// 	let apiKey = request.headers.get('x-api-key');

// 	if (apiKey !== null) {
// 		const hash = await createHash('SHA-256').digest(new TextEncoder().encode(apiKey));
// 		const hashed = base64Url.encode(new Uint8Array(hash), {
// 			padding: false
// 		});

// 		apiKey = hashed;
// 	}

// 	const storageKey = storage.getRegistryFileKey({
// 		scope: scopeName,
// 		registry: name,
// 		version,
// 		fileName
// 	});

// 	const [accessResult, presignedUrl] = await Promise.all([
// 		getFileContentsFast({
// 			scopeName,
// 			registryName: name,
// 			version,
// 			fileName,
// 			sessionToken,
// 			apiKey
// 		}),
// 		getSignedUrl(
// 			storage.client,
// 			new GetObjectCommand({
// 				Bucket: PUBLIC_STORAGE_BUCKET,
// 				Key: storageKey
// 			}),
// 			{
// 				expiresIn: 300
// 			}
// 		)
// 	]);

// 	if (accessResult === null) {
// 		error(404);
// 	}

// 	// LEGACY to support registries that are not serving from s3 temporarily
// 	// !! DELETE THIS LATER !!
// 	if (accessResult.key === null) {
// 		// never cache tags or non public registries
// 		if (accessResult.access !== 'public' || isTag(version)) {
// 			return text(accessResult.content);
// 		}

// 		// caching
// 		// we only cache public registries. A public registry is forever public and cannot be changed to be private.

// 		return text(accessResult.content, {
// 			headers: { 'cache-control': `max-age=${MAX_AGE}, immutable, public` }
// 		});
// 	}

// 	waitUntil(
// 		postFileFetch({
// 			distinctId: getClientAddress(),
// 			scopeName,
// 			registryName: name,
// 			registryVersion: version,
// 			fileName
// 		})
// 	);

// 	redirect(302, presignedUrl);
// }
