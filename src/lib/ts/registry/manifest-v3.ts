import * as v from 'valibot';
import { Err, Ok, type Result } from '../result';
import { manifestSchema, type Manifest } from './manifest';

export type RegistryVersion = 'v2' | 'v3';

export const registryPluginSchema = v.object({
	package: v.string(),
	version: v.optional(v.string()),
	optional: v.optional(v.boolean(), false)
});

export const remoteDependencySchema = v.object({
	ecosystem: v.string(),
	name: v.string(),
	version: v.optional(v.string()),
	dev: v.optional(v.boolean(), false)
});

export type RemoteDependency = v.InferOutput<typeof remoteDependencySchema>;

export const registryManifestFileSchema = v.object({
	path: v.string(),
	type: v.optional(v.string()),
	target: v.optional(v.string())
});

export const registryManifestItemSchema = v.object({
	name: v.string(),
	type: v.string(),
	description: v.optional(v.string()),
	files: v.array(registryManifestFileSchema),
	registryDependencies: v.optional(v.array(v.string())),
	dependencies: v.optional(v.array(remoteDependencySchema)),
	add: v.union([v.literal('on-init'), v.literal('when-needed'), v.literal('when-added')]),
	envVars: v.optional(v.record(v.string(), v.string()))
});

export type RegistryItemV3 = v.InferOutput<typeof registryManifestItemSchema>;

export const manifestV3Schema = v.object({
	name: v.string(),
	description: v.optional(v.string()),
	version: v.string(),
	homepage: v.optional(v.string()),
	tags: v.optional(v.array(v.string())),
	repository: v.optional(v.string()),
	bugs: v.optional(v.string()),
	authors: v.optional(v.array(v.string())),
	meta: v.optional(v.record(v.string(), v.string())),
	plugins: v.optional(
		v.object({
			languages: v.optional(v.array(registryPluginSchema)),
			providers: v.optional(v.array(registryPluginSchema)),
			transforms: v.optional(v.array(registryPluginSchema))
		})
	),
	items: v.array(registryManifestItemSchema),
	defaultPaths: v.optional(v.record(v.string(), v.string()))
});

export type ManifestV3 = v.InferOutput<typeof manifestV3Schema>;

export function validateAndScore(manifest: ManifestV3, hasReadme: boolean): Result<number, string> {
	let score = 0;

	if (hasReadme) score += 40;

	if (manifest.authors) {
		// at least 1 author listed
		if (manifest.authors.length > 0) {
			score += 10;
		}
	}

	if (manifest.homepage) {
		try {
			new URL(manifest.homepage);
		} catch {
			return Err(
				`invalid meta.homepage field in manifest! Couldn't parse url \`${manifest.homepage}\``
			);
		}

		score += 10;
	}

	if (manifest.repository) {
		try {
			new URL(manifest.repository);
		} catch {
			return Err(
				`invalid meta.repository field in manifest! Couldn't parse url \`${manifest.repository}\``
			);
		}

		score += 10;
	}

	if (manifest.bugs) {
		try {
			new URL(manifest.bugs);
		} catch {
			return Err(`invalid meta.bugs field in manifest! Couldn't parse url \`${manifest.bugs}\``);
		}

		score += 10;
	}

	if (manifest.tags) {
		// have at least 2 tags
		if (manifest.tags.length >= 2) {
			score += 10;
		}
	}

	if (manifest.description) {
		score += 10;
	}

	return Ok(score);
}

export type RegistryManifest =
	| ({ manifestVersion: 'v3' } & ManifestV3)
	| ({ manifestVersion: 'v2' } & Manifest);

export function parseManifest({
	content,
	version
}: {
	content: string;
	version: RegistryVersion;
}): RegistryManifest {
	switch (version) {
		case 'v3':
			return {
				manifestVersion: 'v3',
				...v.parse(manifestV3Schema, JSON.parse(content))
			};
		case 'v2':
			return {
				manifestVersion: 'v2',
				...v.parse(manifestSchema, JSON.parse(content))
			};
	}
}
