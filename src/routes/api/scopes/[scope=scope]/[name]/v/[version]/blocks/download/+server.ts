import { getFiles } from '$lib/backend/db/functions.js';
import { manifestSchema } from '$lib/ts/registry/manifest.js';
import { error } from '@sveltejs/kit';
import archiver from 'archiver';
import path from 'path';
import * as v from 'valibot';

export async function GET({ locals, params, setHeaders }) {
	const session = await locals.auth();

	const { scope, name, version } = params;

	const scopeName = scope.slice(1);

	const manifestFiles = await getFiles({
		userId: session?.user.id,
		scopeName,
		registryName: name,
		version,
		fileNames: ['jsrepo-manifest.json']
	});

	if (manifestFiles === null) error(404);

	const manifest = v.parse(manifestSchema, JSON.parse(manifestFiles[0].content));

	// figure out which files we need from the manifest

	const files = await getFiles({
		userId: session?.user.id ?? null,
		scopeName,
		registryName: name,
		version,
		fileNames: manifest.categories
			.flatMap((c) => c.blocks)
			.flatMap((b) => b.files.map((f) => path.join(b.directory, f)))
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
