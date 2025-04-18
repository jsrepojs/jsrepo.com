import { getFileContents } from '$lib/backend/db/functions.js';
import { error, text } from '@sveltejs/kit';

export async function GET({ params }) {
	// eslint-disable-next-line prefer-const
	let { scope, name, version, fileName } = params;

	if (!scope.startsWith('@')) {
		error(400, `invalid scope '${scope}' scopes must start with '@'`);
	}

	scope = scope.slice(1);

	const contents = await getFileContents(scope, name, version, fileName);

	if (contents === null) {
		error(404);
	}

	return text(contents);
}
