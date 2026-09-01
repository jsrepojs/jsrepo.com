import type { RegistryAccess } from '$lib/backend/db/schema';
import { isTag } from '$lib/ts/versioning';
import archiver from 'archiver';

/** How long the CDN and browsers may keep a zip for a public, immutable registry version (seconds) */
const PUBLIC_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Zips the provided files in memory */
export async function zipFiles(
	files: { name: string; content: string }[]
): Promise<Buffer<ArrayBuffer>> {
	const archive = archiver('zip', { zlib: { level: 6 } });

	const chunks: Buffer[] = [];
	archive.on('data', (chunk) => chunks.push(chunk));

	for (const file of files) {
		archive.append(file.content, { name: file.name });
	}

	await archive.finalize();

	return Buffer.concat(chunks);
}

/**
 * Headers for a zip download.
 *
 * A specific (semver) version of a public registry can never change, so the response is marked
 * immutable and cacheable at the edge which lets repeat downloads (and crawlers following the
 * download links on registry pages) skip the function entirely. Tags and non public registries are
 * never cached.
 */
export function zipDownloadHeaders({
	access,
	version,
	fileName
}: {
	access: RegistryAccess;
	version: string;
	/** Name the browser should save the zip as */
	fileName: string;
}): Record<string, string> {
	// keep the header well formed regardless of what ends up in a name
	const safeName = fileName.replace(/[^A-Za-z0-9@._-]/g, '_');

	const headers: Record<string, string> = {
		'Content-Type': 'application/zip',
		'Content-Disposition': `attachment; filename="${safeName}"`
	};

	if (access === 'public' && !isTag(version)) {
		headers['Cache-Control'] =
			`public, max-age=${PUBLIC_MAX_AGE}, s-maxage=${PUBLIC_MAX_AGE}, immutable`;
	} else {
		headers['Cache-Control'] = 'private, no-store';
	}

	return headers;
}
