import { getManifestAndSpecificFilesFromVersion } from '$lib/backend/db/functions.js';
import { parseManifest } from '$lib/ts/registry/manifest-v3';
import { error } from '@sveltejs/kit';
import archiver from 'archiver';

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

	const { manifest: manifestFile, files } = bundle;

	const manifest = parseManifest({ content: manifestFile.content, version: manifestFile.version });

	if (manifest.manifestVersion === 'v2') {
		error(400, 'Incompatible manifest version!');
	} else {
		const item = manifest.items.find((i) => i.name === itemName);

		if (item === undefined) error(404);

		const itemJson = files.find((f) => f.name === itemJsonName);

		if (itemJson === undefined) error(404);

		const archive = archiver('zip', { zlib: { level: 6 } });

		const chunks: Buffer[] = [];
		archive.on('data', (chunk) => chunks.push(chunk));

		archive.append(itemJson.content, { name: itemJson.name });

		await archive.finalize();

		setHeaders({
			'Content-Type': 'application/zip',
			'Content-Disposition': 'attachment;'
		});

		return new Response(Buffer.concat(chunks));
	}
}
