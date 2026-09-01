import { getFilesWithAccess } from '$lib/backend/db/functions.js';
import { zipDownloadHeaders, zipFiles } from '$lib/backend/download.js';
import { error } from '@sveltejs/kit';

export async function GET({ locals, params, setHeaders }) {
	const session = await locals.auth();

	const { scope, name, version } = params;

	const scopeName = scope.slice(1);

	const result = await getFilesWithAccess({
		userId: session?.user.id ?? null,
		scopeName,
		registryName: name,
		version
	});

	if (result === null) error(404);

	const zip = await zipFiles(result.files);

	setHeaders(
		zipDownloadHeaders({ access: result.access, version, fileName: `${scopeName}_${name}.zip` })
	);

	return new Response(zip);
}
