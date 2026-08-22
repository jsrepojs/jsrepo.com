import type { RegistryManifest, RemoteDependency } from '$lib/ts/registry/manifest-v3';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { RegistryInfo } from './types';

/** Builds a stable identity for a remote dependency so it can be deduplicated. */
export function remoteDependencyKey(dependency: RemoteDependency): string {
	return `${dependency.ecosystem}:${dependency.name}${dependency.version ? `@${dependency.version}` : ''}`;
}

export function getRegistryInfo(manifest: RegistryManifest): RegistryInfo {
	if (manifest.manifestVersion === 'v2') {
		const dependencies = new SvelteSet<string>();

		for (const category of manifest.categories) {
			for (const block of category.blocks) {
				for (const dep of [...block.dependencies, ...block.devDependencies]) {
					dependencies.add(dep);
				}
			}
		}

		return {
			version: 'v2',
			categories: manifest.categories.length,
			blocks: manifest.categories.flatMap((c) => c.blocks).length,
			dependencies: Array.from(dependencies)
		};
	} else {
		// dependencies are objects so they have to be deduplicated by value instead of by reference
		const dependencies = new SvelteMap<string, RemoteDependency>();

		for (const item of manifest.items) {
			for (const dep of [...(item.dependencies ?? []), ...(item.devDependencies ?? [])]) {
				const key = remoteDependencyKey(dep);

				if (!dependencies.has(key)) {
					dependencies.set(key, dep);
				}
			}
		}

		return {
			version: 'v3',
			items: manifest.items.length,
			dependencies: Array.from(dependencies.values())
		};
	}
}
