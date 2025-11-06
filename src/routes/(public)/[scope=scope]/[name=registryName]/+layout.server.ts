import {
	getVersion,
	getManifestFile,
	hasScopeAccess
} from '$lib/backend/db/functions.js';
import { parseManifest } from '$lib/ts/registry/manifest-v3.js';
import { error } from '@sveltejs/kit';

export async function load({ params, locals }) {
	const session = await locals.auth();

	const scopeName = params.scope.slice(1);
	const registryName = params.name;

	const [version, manifestFile] = await Promise.all([
		getVersion({
			scopeName,
			registryName,
			version: 'latest',
			userId: session?.user.id ?? null
		}),
		getManifestFile({
			scopeName,
			registryName,
			version: 'latest',
			userId: session?.user.id ?? null
		})
	])

	if (version === null || manifestFile === null) error(404);

	const settingsAccess = hasScopeAccess(session?.user.id ?? null, scopeName)

	const manifest = parseManifest({ content: manifestFile.content, version: manifestFile.version! })

	return {
		version, 
		manifest,
		settingsAccess,
		versions: []
	}
}
