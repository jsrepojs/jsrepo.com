import { getSessionCookie } from 'better-auth/cookies';
import { getFileContentsTheHardWay, postFileFetch } from '$lib/backend/db/functions.js';
import { error, text } from '@sveltejs/kit';
import { waitUntil } from '@vercel/functions';

export async function GET({ params, request, getClientAddress }) {
	// eslint-disable-next-line prefer-const
	let { scope, name, version, fileName } = params;

	const scopeName = scope.slice(1);

	const cookie = getSessionCookie(request.headers);

	const sessionToken = cookie?.split('.')[0] ?? null;
	const apiKey = request.headers.get('x-api-key');

	const contents = await getFileContentsTheHardWay({
		scopeName,
		registryName: name,
		version,
		fileName,
		sessionToken,
		apiKey
	});

	if (contents === null) {
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

	return text(contents);
}
