import type { RegistryManifest } from "$lib/ts/registry/manifest-v3";
import { SvelteSet } from "svelte/reactivity";
import type { RegistryInfo } from "./types";

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
        return {
            version: 'v3',
            items: manifest.items.length,
            dependencies: manifest.items.flatMap((i) => [
                ...(i.dependencies ?? []),
                ...(i.devDependencies ?? [])
            ])
        };
    }
}