import { getManifestFile, getRegistry, getVersions } from '$lib/backend/db/functions.js';
import { error, json } from '@sveltejs/kit';
import * as tables from '$lib/backend/db/schema.js';
import type { Category, Manifest } from '$lib/ts/registry/manifest.js';
import { determinePrimaryLanguage } from '$lib/ts/registry/index.js';
import { parseManifest, type RegistryItemV3 } from '$lib/ts/registry/manifest-v3';

type MinUser = {
	name: string;
	username: string;
	email: string;
};

export type RegistryInfoResponseV2 = {
	manifestVersion: 'v2';
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
}

export type RegistryInfoResponseV3 = {
	manifestVersion: 'v3';
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
	items: RegistryItemV3[];
	tags: Record<string, string>;
	versions: string[];
	time: Record<string, Date>;
};

export async function GET({ locals, params }) {
	const scope = params.scope.slice(1);
	const registryName = params.name;

	const session = await locals.auth();

	const registryResponse = getRegistry({
		scopeName: scope,
		registryName,
		userId: session?.user.id ?? null
	});

	const data = Promise.all([
		getVersions(scope, registryName),
		getManifestFile({
			scopeName: scope,
			registryName,
			version: 'latest',
			userId: session?.user.id,
		})
	]);

	const registry = await registryResponse;

	if (registry === null) error(404);

	const [versions, manifestResult] = await data;

	if (manifestResult === null) error(404);

	const manifest = parseManifest({ content: manifestResult.content, version: manifestResult.version });

	if (manifest.manifestVersion === 'v3') {
		const primaryLanguage = determinePrimaryLanguage(
			...manifest.items.flatMap((i) => i.files.map((f) => f.path))
		);
	
		const tags: RegistryInfoResponseV3['tags'] = {};
		const time: RegistryInfoResponseV3['time'] = {};
	
		if (versions) {
			for (const version of versions) {
				time[version.version] = version.createdAt;
	
				if (version.tag === null) continue;
	
				tags[version.tag] = version.version;
			}
		}
	
		return json({
			manifestVersion: 'v3',
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
			items: manifest.items,
		} satisfies RegistryInfoResponseV3);
	} else if (manifest.manifestVersion === 'v2') {
		const primaryLanguage = determinePrimaryLanguage(
			...manifest.categories.flatMap((c) => c.blocks.flatMap((b) => b.files))
		);
	
		const tags: RegistryInfoResponseV2['tags'] = {};
		const time: RegistryInfoResponseV2['time'] = {};
	
		if (versions) {
			for (const version of versions) {
				time[version.version] = version.createdAt;
	
				if (version.tag === null) continue;
	
				tags[version.tag] = version.version;
			}
		}
	
		return json({
			manifestVersion: 'v2',
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
		} satisfies RegistryInfoResponseV2);
	}
}
