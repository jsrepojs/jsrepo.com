import { getManifestAndSpecificFilesFromVersion } from '$lib/backend/db/functions.js';
import { zipDownloadHeaders, zipFiles } from '$lib/backend/download.js';
import { parseManifest } from '$lib/ts/registry/manifest-v3';
import { error } from '@sveltejs/kit';
import path from 'path';

export async function GET({ locals, params, setHeaders }) {
	const session = await locals.auth();

	const { scope, name, version, category, block: blockName } = params;

	const scopeName = scope.slice(1);

	// one DB round trip, one S3 round trip and one pass over the tarball:
	// the manifest tells us which files belong to the block as we stream past them
	const bundle = await getManifestAndSpecificFilesFromVersion({
		userId: session?.user.id,
		scopeName,
		registryName: name,
		version,
		pickFromManifest: (manifestFile) => {
			const manifest = parseManifest({
				content: manifestFile.content,
				version: manifestFile.version
			});

			if (manifest.manifestVersion === 'v3') return [];

			const block = manifest.categories
				.find((c) => c.name === category)
				?.blocks.find((b) => b.name === blockName);

			if (block === undefined) return [];

			return block.files.map((f) => path.join(block.directory, f));
		}
	});

	if (bundle === null) error(404);

	const { manifest: manifestFile, files, access } = bundle;

	const manifest = parseManifest({ content: manifestFile.content, version: manifestFile.version });

	if (manifest.manifestVersion === 'v3') {
		error(400, 'Incompatible manifest version!');
	}

	const block = manifest.categories
		.find((c) => c.name === category)
		?.blocks.find((b) => b.name === blockName);

	if (block === undefined) error(404);

	if (files.length === 0) error(404);

	const zip = await zipFiles(files);

	setHeaders(zipDownloadHeaders({ access, version, fileName: `${category}_${blockName}.zip` }));

	return new Response(zip);
}
