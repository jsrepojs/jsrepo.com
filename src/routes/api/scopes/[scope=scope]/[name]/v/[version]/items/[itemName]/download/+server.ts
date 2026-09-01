import { getManifestAndSpecificFilesFromVersion } from '$lib/backend/db/functions.js';
import { zipDownloadHeaders, zipFiles } from '$lib/backend/download.js';
import { parseManifest } from '$lib/ts/registry/manifest-v3';
import { error } from '@sveltejs/kit';

export async function GET({ locals, params, setHeaders }) {
	const session = await locals.auth();

	const { scope, name, version, itemName } = params;

	const scopeName = scope.slice(1);

	const itemJsonName = `${itemName}.json`;

	const bundle = await getManifestAndSpecificFilesFromVersion({
		userId: session?.user.id,
		scopeName,
		registryName: name,
		version,
		specificFileNames: [itemJsonName]
	});

	if (bundle === null) error(404);

	const { manifest: manifestFile, files, access } = bundle;

	const manifest = parseManifest({ content: manifestFile.content, version: manifestFile.version });

	if (manifest.manifestVersion === 'v2') {
		error(400, 'Incompatible manifest version!');
	}

	const item = manifest.items.find((i) => i.name === itemName);

	if (item === undefined) error(404);

	const itemJson = files.find((f) => f.name === itemJsonName);

	if (itemJson === undefined) error(404);

	const zip = await zipFiles([itemJson]);

	setHeaders(zipDownloadHeaders({ access, version, fileName: `${itemName}.zip` }));

	return new Response(zip);
}
