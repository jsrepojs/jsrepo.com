import type { GetVersionResult } from "$lib/backend/db/functions";
import type { RegistryManifest } from "$lib/ts/registry/manifest-v3"
import { Context } from "runed";

export type RegistryManagerOptions = {
    version: GetVersionResult;
    manifest: RegistryManifest
    settingsAccess: Promise<boolean>
}

type RegistryInfoV2 = {
    version: 'v2';
    categories: number;
    blocks: number;
    dependencies: number;
}

type RegistryInfoV3 = {
    version: 'v3';
    items: number;
    dependencies: number;
}

export class RegistryManager {
    constructor(readonly opts: RegistryManagerOptions) {

    }

    description = $derived.by(() => {
        if (this.opts.manifest.manifestVersion === 'v2') {
            return this.opts.manifest.meta?.description;
        } else {
            return this.opts.manifest.description;
        }
    });

    get scope() {
        return this.opts.version.scope;
    }

    get registry() {
        return this.opts.version.registry;
    }

    get releasedBy() {
        return this.opts.version.releasedBy;
    }

    get info(): RegistryInfoV2 | RegistryInfoV3 {
        if (this.opts.manifest.manifestVersion === 'v2') {
            return {
                version: 'v2',
                categories: this.opts.manifest.categories.length,
                blocks: this.opts.manifest.categories.flatMap((c) => c.blocks).length,
                dependencies: this.opts.manifest.categories.flatMap((c) => c.blocks.flatMap((b) => b.dependencies)).length
            }
        } else {
            return {
                version: 'v3',
                items: this.opts.manifest.items.length,
                dependencies: this.opts.manifest.items.flatMap((i) => i.remoteDependencies ?? []).length
            }
        }
    }

    get settingsAccess() {
        return this.opts.settingsAccess;
    }
}

export const RegistryContext = new Context<RegistryManager>('registry-ctx');

export function setupRegistry(opts: RegistryManagerOptions) {
    return RegistryContext.set(new RegistryManager(opts));
}