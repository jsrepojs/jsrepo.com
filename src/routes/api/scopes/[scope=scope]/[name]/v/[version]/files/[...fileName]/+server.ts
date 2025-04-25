import { getFileContents, postFileFetch } from '$lib/backend/db/functions.js';
import { error, text } from '@sveltejs/kit';
import { waitUntil } from '@vercel/functions';

export async function GET({ params, locals, getClientAddress }) {
	// eslint-disable-next-line prefer-const
	let { scope, name, version, fileName } = params;

	const scopeName = scope.slice(1);

	const session = await locals.auth();

	const contents = await getFileContents(
		session?.user.id ?? null,
		scopeName,
		name,
		version,
		fileName
	);

	if (contents === null) {
		error(404);
	}

	waitUntil(
		postFileFetch({
			distinctId: session?.user.id ?? getClientAddress(),
			scopeName,
			registryName: name,
			registryVersion: version,
			fileName
		})
	);

	return text(contents);
}
