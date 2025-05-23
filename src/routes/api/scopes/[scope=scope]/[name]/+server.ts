import {
	getFiles,
	getRegistry,
	getVersions,
	validateAccessToken
} from '$lib/backend/db/functions.js';
import { error, json } from '@sveltejs/kit';
import * as tables from '$lib/backend/db/schema.js';
import type { Category, Manifest } from '$lib/ts/registry/manifest.js';
import { determinePrimaryLanguage } from '$lib/ts/registry/index.js';

type MinUser = {
	name: string;
	username: string;
	email: string;
};

export type RegistryInfoResponse = {
	name: string;
	version: string;
	releasedBy: MinUser;
	primaryLanguage: string;
	firstPublishedAt: Date;
	meta: {
		authors: string[] | undefined;
		bugs: string | undefined;
		description: string | undefined;
		homepage: string | undefined;
		repository: string | undefined;
		tags: string[] | undefined;
	};
	access: tables.RegistryAccess;
	peerDependencies: NonNullable<Manifest['peerDependencies']> | null;
	configFiles: NonNullable<Manifest['configFiles']> | null;
	categories: Category[];
	tags: Record<string, string>;
	versions: string[];
	time: Record<string, Date>;
};

export async function GET({ locals, params, request }) {
	const scope = params.scope.slice(1);
	const registryName = params.name;

	let userId: string | null;
	if (request.headers.get('authorization')) {
		userId = await validateAccessToken({ headers: request.headers });
	} else {
		userId = (await locals.auth())?.user.id ?? null;
	}

	if (!userId) error(401);

	const registryResponse = getRegistry({
		scopeName: scope,
		registryName,
		userId
	});

	const data = Promise.all([
		getVersions(scope, registryName),
		getFiles({
			scopeName: scope,
			registryName,
			version: 'latest',
			userId,
			fileNames: ['jsrepo-manifest.json']
		})
	]);

	const registry = await registryResponse;

	if (registry === null) error(404);

	const [versions, manifestResult] = await data;

	const manifest = JSON.parse(manifestResult[0].content) as Manifest;

	const primaryLanguage = determinePrimaryLanguage(...manifest.categories.flatMap((c) => c.blocks));

	const tags: RegistryInfoResponse['tags'] = {};
	const time: RegistryInfoResponse['time'] = {};

	if (versions) {
		for (const version of versions) {
			time[version.version] = version.createdAt;

			if (version.tag === null) continue;

			tags[version.tag] = version.version;
		}
	}

	return json({
		name: `@${scope}/${registryName}`,
		version: registry.latestVersion?.version ?? '',
		firstPublishedAt: registry.createdAt,
		meta: {
			authors: registry.metaAuthors ?? undefined,
			bugs: registry.metaBugs ?? undefined,
			description: registry.metaDescription ?? undefined,
			homepage: registry.metaHomepage ?? undefined,
			repository: registry.metaRepository ?? undefined,
			tags: registry.metaTags ?? undefined
		},
		releasedBy: {
			name: registry.releasedBy?.name ?? '',
			username: registry.releasedBy?.username ?? '',
			email: registry.releasedBy?.email ?? ''
		},
		tags: tags,
		time,
		primaryLanguage,
		versions: versions?.map((v) => v.version) ?? [],
		access: registry.access,
		peerDependencies: manifest.peerDependencies ?? null,
		configFiles: manifest.configFiles ?? null,
		categories: manifest.categories
	} satisfies RegistryInfoResponse);
}
