import { gunzipSync, gzipSync } from 'zlib';
import DOMPurify from 'isomorphic-dompurify';
import { closeVersionTarball, openVersionTarball } from '$lib/backend/db/functions';
import { rehype } from '$lib/ts/markdown';
import * as promise from '$lib/ts/promises';
import { redis } from '$lib/ts/redis';
import {
	extractManifestAndSpecific,
	isManifestFileName,
	manifestVersionFromFileName
} from '$lib/ts/tarz';

/** A tarball never changes once published so rendered output can be cached for a long time */
const RENDERED_VERSION_CACHE_TTL_S = 60 * 60 * 24 * 30; // 30 days
/**
 * Upstash caps a single request at 1 MB. Entries are gzipped before they are stored (highlighted
 * README html compresses roughly 50-70x) so this is only a safety net for pathological inputs.
 */
const RENDERED_VERSION_CACHE_MAX_BYTES = 950_000;

export type RenderedVersion = {
	/** Sanitized README html */
	readme: string | null;
	manifest: { content: string; version: 'v2' | 'v3' };
};

export type RenderedVersionOptions = {
	scopeName: string;
	registryName: string;
	version: string;
	userId: string | null;
};

/** gzip + base64 so large rendered pages fit comfortably in a single Redis request */
function encodeRenderedVersion(rendered: RenderedVersion): string {
	return gzipSync(JSON.stringify(rendered)).toString('base64');
}

function decodeRenderedVersion(cached: unknown): RenderedVersion | null {
	if (typeof cached !== 'string' || cached === '') return null;

	try {
		const parsed = JSON.parse(gunzipSync(Buffer.from(cached, 'base64')).toString());

		if (parsed && typeof parsed === 'object' && 'manifest' in parsed) {
			return parsed as RenderedVersion;
		}
	} catch {
		// corrupt or foreign entry, treat as a miss
	}

	return null;
}

/**
 * Reads the README and manifest for a version and renders the README.
 *
 * Rendering (markdown -> html with syntax highlighting -> sanitize) is the most expensive part of a
 * registry page load so the result is cached keyed by the version it was rendered from. The publish
 * endpoints call this right after a version is created so visitors never pay for the first render.
 */
export async function getRenderedVersion({
	scopeName,
	registryName,
	version,
	userId
}: RenderedVersionOptions): Promise<RenderedVersion | null> {
	const opened = await openVersionTarball({
		userId,
		scopeName,
		registryName,
		version,
		readonlyAccess: true
	});

	if (opened === null) return null;

	// the version id guards against a registry being deleted and re-created with the same name and version
	const cacheKey = `rendered-version:v2:${opened.versionId}:${opened.tarball}`;

	try {
		const cached = decodeRenderedVersion(await redis.get<string>(cacheKey));

		if (cached !== null) {
			closeVersionTarball(opened);
			return cached;
		}
	} catch {
		// Redis miss or bad payload — read from storage
	}

	const { manifest, files } = await promise.timed(
		extractManifestAndSpecific(opened.body, ['README.md']),
		`@${scopeName}/${registryName}@${version} - extract`
	);

	if (manifest === null || !isManifestFileName(manifest.name)) return null;

	let readme = files.find((f) => f.name === 'README.md')?.content ?? null;

	if (readme !== null) {
		const html = (
			await promise.timed(rehype(readme), `@${scopeName}/${registryName}@${version} - rehype`)
		).toString();

		readme = DOMPurify.sanitize(html);
	}

	const rendered: RenderedVersion = {
		readme,
		manifest: {
			content: manifest.content,
			version: manifestVersionFromFileName(manifest.name)
		}
	};

	const encoded = encodeRenderedVersion(rendered);

	if (Buffer.byteLength(encoded) <= RENDERED_VERSION_CACHE_MAX_BYTES) {
		try {
			await redis.set(cacheKey, encoded, { ex: RENDERED_VERSION_CACHE_TTL_S });
		} catch {
			// ignore cache write failures
		}
	}

	return rendered;
}

/** Fills the render cache for a freshly published version. Never throws; a miss just means the first visitor renders it. */
export async function warmRenderedVersion(options: RenderedVersionOptions): Promise<void> {
	try {
		await getRenderedVersion(options);
	} catch (err) {
		console.error(
			`failed to pre-render @${options.scopeName}/${options.registryName}@${options.version}`,
			err
		);
	}
}
