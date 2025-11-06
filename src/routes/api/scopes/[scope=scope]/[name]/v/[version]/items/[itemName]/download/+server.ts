import { getFiles, getManifestFile } from '$lib/backend/db/functions.js';
import { parseManifest } from '$lib/ts/registry/manifest-v3';
import { error } from '@sveltejs/kit';
import archiver from 'archiver';

export async function GET({ locals, params, setHeaders }) {
	const session = await locals.auth();

	const { scope, name, version, itemName } = params;

	const scopeName = scope.slice(1);

	const manifestFile = await getManifestFile({
		userId: session?.user.id,
		scopeName,
		registryName: name,
		version
	});

	if (manifestFile === null) error(404);

	const manifest = parseManifest({ content: manifestFile.content, version: manifestFile.version });

	if (manifest.manifestVersion === 'v2') {
		error(400, 'Incompatible manifest version!');
	} else {
		const item = manifest.items
			.find((i) => i.name === itemName);

		if (item === undefined) error(404);

		// figure out which files we need from the manifest

		const files = await getFiles({
			userId: session?.user.id ?? null,
			scopeName,
			registryName: name,
			version,
			fileNames: [`${item.name}.json`]
		});

		if (files === null) error(404);

		const archive = archiver('zip', { zlib: { level: 9 } });

		const chunks: Buffer[] = [];
		archive.on('data', (chunk) => chunks.push(chunk));

		for (const file of files) {
			archive.append(file.content, { name: file.name });
		}

		await archive.finalize();

		setHeaders({
			'Content-Type': 'application/zip',
			'Content-Disposition': 'attachment;'
		});

		return new Response(Buffer.concat(chunks));
	}
}
