import { getFileContents } from '$lib/backend/db/functions.js';
import { error, text } from '@sveltejs/kit';

export async function GET({ params, locals }) {
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

	return text(contents);
}
