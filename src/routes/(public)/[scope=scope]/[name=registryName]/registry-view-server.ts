import {
	canLeaveReview,
	closeVersionTarball,
	getRegistry,
	openVersionTarball,
	getVersions,
	getWeeklyDownloadsForLastYear,
	leaveReview,
	type RegistryDetails,
	type WeeklyDownloads
} from '$lib/backend/db/functions';
import * as tables from '$lib/backend/db/schema';
import DOMPurify from 'isomorphic-dompurify';
import { rehype } from '$lib/ts/markdown';
import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { reviewSchema } from '$lib/components/site/registry-view/types';
import type { Action } from './$types';
import assert from 'assert';
import * as promise from '$lib/ts/promises';
import { redis } from '$lib/ts/redis';
import { parseManifest, type RegistryManifest } from '$lib/ts/registry/manifest-v3';
import {
	extractManifestAndSpecific,
	isManifestFileName,
	manifestVersionFromFileName
} from '$lib/ts/tarz';

const WEEKLY_DOWNLOADS_CACHE_TTL_S = 60 * 60 * 24; // 1 day

async function getWeeklyDownloadsCached(
	scopeName: string,
	registryName: string
): Promise<WeeklyDownloads[]> {
	const key = `weekly-downloads:v1:${scopeName.toLowerCase()}:${registryName.toLowerCase()}`;

	try {
		// the client deserializes JSON for us, older entries may still be stored as a string
		const cached = await redis.get<WeeklyDownloads[] | string>(key);
		if (Array.isArray(cached)) return cached;
		if (typeof cached === 'string' && cached !== '') {
			return JSON.parse(cached) as WeeklyDownloads[];
		}
	} catch {
		// Redis miss or bad payload — load from DB
	}

	const data = await getWeeklyDownloadsForLastYear({
		scope: scopeName,
		registry: registryName
	});

	try {
		await redis.set(key, data, { ex: WEEKLY_DOWNLOADS_CACHE_TTL_S });
	} catch {
		// ignore cache write failures
	}

	return data;
}

/** A tarball never changes once published so rendered output can be cached for a long time */
const RENDERED_VERSION_CACHE_TTL_S = 60 * 60 * 24 * 7; // 7 days
/** Upstash rejects large payloads, skip caching anything close to the limit */
const RENDERED_VERSION_CACHE_MAX_BYTES = 900_000;

type RenderedVersion = {
	/** Sanitized README html */
	readme: string | null;
	manifest: { content: string; version: 'v2' | 'v3' };
};

/**
 * Reads the README and manifest for a version and renders the README.
 *
 * Rendering (markdown -> html with syntax highlighting -> sanitize) is the most expensive part of a
 * registry page load so the result is cached keyed by the tarball the version was published with.
 */
async function getRenderedVersion({
	scopeName,
	registryName,
	version,
	userId
}: Options): Promise<RenderedVersion | null> {
	const opened = await openVersionTarball({
		userId,
		scopeName,
		registryName,
		version,
		readonlyAccess: true
	});

	if (opened === null) return null;

	// the version id guards against a registry being deleted and re-created with the same name and version
	const cacheKey = `rendered-version:v1:${opened.versionId}:${opened.tarball}`;

	try {
		const cached = await redis.get<RenderedVersion>(cacheKey);

		if (cached && typeof cached === 'object' && 'manifest' in cached) {
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

	if (JSON.stringify(rendered).length <= RENDERED_VERSION_CACHE_MAX_BYTES) {
		try {
			await redis.set(cacheKey, rendered, { ex: RENDERED_VERSION_CACHE_TTL_S });
		} catch {
			// ignore cache write failures
		}
	}

	return rendered;
}

export type Options = {
	scopeName: string;
	registryName: string;
	version: string;
	userId: string | null;
};

export type Info = {
	readme: string | null;
	manifest: RegistryManifest;
	versions: tables.Version[];
	registry: RegistryDetails;
	weeklyDownloads: Promise<WeeklyDownloads[]>;
};

export async function getInfo({
	scopeName,
	registryName,
	version,
	userId
}: Options): Promise<Info | null> {
	const registryPromise = promise.timed(
		getRegistry({ scopeName, registryName, userId }),
		'getRegistry - registryPromise'
	);

	const weeklyDownloads = getWeeklyDownloadsCached(scopeName, registryName);

	const promises = promise.allTimed(
		[
			getVersions(scopeName, registryName),
			getRenderedVersion({ scopeName, registryName, version, userId })
		],
		`@${scopeName}/${registryName} - getInfo - promises`
	);

	const registry = await registryPromise;

	// here we'd return 404 because the registry doesn't exist or the user doesn't have access
	if (!registry) return null;

	const [versions, rendered] = await promises;

	if (rendered === null) return null;
	if (!versions || versions.length === 0) return null;

	return {
		readme: rendered.readme,
		manifest: parseManifest({
			content: rendered.manifest.content,
			version: rendered.manifest.version
		}),
		registry,
		versions,
		weeklyDownloads
	};
}

const review: Action = async ({ request, locals, params }) => {
	const form = await superValidate(request, valibot(reviewSchema));

	if (!form.valid) {
		return fail(400, { form });
	}

	const session = await locals.auth();

	if (!session) return fail(401);

	const scopeName = params.scope.slice(1);
	const registryName = params.name;

	const [authorized, registry] = await Promise.all([
		canLeaveReview({
			userId: session?.user.id,
			scope: params.scope.slice(1),
			registry: params.name
		}),
		getRegistry({ scopeName, registryName, userId: session?.user.id ?? null })
	]);

	if (!authorized) return fail(401);

	assert(registry !== null, 'registry must be defined');

	// create review

	const result = await leaveReview({
		...form.data,
		registryId: registry.id,
		userId: session?.user.id
	});

	if (!result) return fail(500, { message: 'error leaving review' });

	return message(form, 'Success');
};

export const actions = {
	review
};
