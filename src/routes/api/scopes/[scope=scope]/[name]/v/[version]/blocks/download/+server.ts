import { getFiles } from '$lib/backend/db/functions.js';
import { error } from '@sveltejs/kit';
import archiver from 'archiver';

export async function GET({ locals, params, setHeaders }) {
	const session = await locals.auth();

	const { scope, name, version } = params;

	const scopeName = scope.slice(1);

	// figure out which files we need from the manifest

	const files = await getFiles({
		userId: session?.user.id ?? null,
		scopeName,
		registryName: name,
		version
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
