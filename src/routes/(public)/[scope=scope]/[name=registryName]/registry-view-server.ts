import { getFiles, getRegistry, getVersions } from '$lib/backend/db/functions';
import { manifestSchema, type Manifest } from '$lib/ts/registry/manifest';
import * as tables from '$lib/backend/db/schema';
import * as v from 'valibot';
import DOMPurify from 'isomorphic-dompurify';
import { rehype } from '$lib/ts/markdown';

export type Options = {
	scopeName: string;
	registryName: string;
	version: string;
	userId: string | null;
};

export type Info = {
	readme: string | null;
	manifest: Manifest;
	versions: tables.Version[];
	registry: tables.Registry;
};

export async function getInfo({
	scopeName,
	registryName,
	version,
	userId
}: Options): Promise<Info | null> {
	const registryPromise = getRegistry(scopeName, registryName, userId);

	const promises = Promise.all([
		getVersions(scopeName, registryName),
		getFiles(userId, scopeName, registryName, version, ['README.md', 'jsrepo-manifest.json'])
	]);

	const registry = await registryPromise;

	// here we'd return 404 because the registry doesn't exist or the user doesn't have access
	if (!registry) return null;

	const [versions, files] = await promises;

	let readme = files.find((f) => f.name === 'README.md')?.content ?? null;
	const manifestContent = files.find((f) => f.name === 'jsrepo-manifest.json')?.content;

	if (manifestContent === undefined) return null;
	if (!versions || versions.length === 0) return null;

	if (readme !== null) {
		const html = (await rehype(readme)).toString();

		readme = DOMPurify.sanitize(html);
	}

	return {
		readme,
		manifest: v.parse(manifestSchema, JSON.parse(manifestContent)),
		registry,
		versions
	};
}
