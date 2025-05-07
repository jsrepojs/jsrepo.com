import * as v from 'valibot';
import { Err, Ok, type Result } from '../result';

export const blockSchema = v.object({
	name: v.string(),
	category: v.string(),
	localDependencies: v.array(v.string()),
	dependencies: v.array(v.string()),
	devDependencies: v.array(v.string()),
	tests: v.boolean(),
	list: v.optional(v.boolean(), true),
	/** Where to find the block relative to root */
	directory: v.string(),
	subdirectory: v.boolean(),
	files: v.array(v.string()),
	_imports_: v.record(v.string(), v.string())
});

export const categorySchema = v.object({
	name: v.string(),
	blocks: v.array(blockSchema)
});

export const manifestMeta = v.object({
	authors: v.optional(v.array(v.string())),
	bugs: v.optional(v.string()),
	description: v.optional(v.string()),
	homepage: v.optional(v.string()),
	repository: v.optional(v.string()),
	tags: v.optional(v.array(v.string()))
});

export const peerDependencySchema = v.record(
	v.string(),
	v.union([
		v.string(),
		v.object({
			version: v.string(),
			message: v.string()
		})
	])
);

export type PeerDependency = v.InferOutput<typeof peerDependencySchema>;

export const configFileSchema = v.object({
	name: v.string(),
	path: v.string(),
	expectedPath: v.optional(v.string()),
	optional: v.optional(v.boolean(), false)
});

export type ConfigFile = v.InferOutput<typeof configFileSchema>;

export const manifestConfigFileSchema = v.object({
	...configFileSchema.entries,
	dependencies: v.optional(v.array(v.string())),
	devDependencies: v.optional(v.array(v.string()))
});

export const accessLevel = v.union([v.literal("public"), v.literal("private"), v.literal("marketplace")]);

export const manifestSchema = v.object({
	name: v.string(),
	version: v.string(),
	meta: v.optional(manifestMeta),
	access: v.optional(accessLevel),
	peerDependencies: v.optional(peerDependencySchema),
	configFiles: v.optional(v.array(manifestConfigFileSchema)),
	categories: v.array(categorySchema),
});

export type Meta = v.InferOutput<typeof manifestMeta>;

export type Category = v.InferOutput<typeof categorySchema>;

export type Block = v.InferOutput<typeof blockSchema>;

export type Manifest = v.InferOutput<typeof manifestSchema>;

export function validateAndScore(manifest: Manifest, hasReadme: boolean): Result<number, string> {
	let score = 0;

	if (hasReadme) score += 40;

	// validate manifest metadata
	if (manifest.meta) {
		const meta = manifest.meta;

		if (meta.authors) {
			// at least 1 author listed
			if (meta.authors.length > 0) {
				score += 10;
			}
		}

		if (meta.homepage) {
			try {
				new URL(meta.homepage);
			} catch {
				return Err(
					`invalid meta.homepage field in manifest! Couldn't parse url \`${meta.homepage}\``
				);
			}

			score += 10;
		}

		if (meta.repository) {
			try {
				new URL(meta.repository);
			} catch {
				return Err(
					`invalid meta.repository field in manifest! Couldn't parse url \`${meta.repository}\``
				);
			}

			score += 10;
		}

		if (meta.bugs) {
			try {
				new URL(meta.bugs);
			} catch {
				return Err(`invalid meta.bugs field in manifest! Couldn't parse url \`${meta.bugs}\``);
			}

			score += 10;
		}

		if (meta.tags) {
			// have at least 2 tags
			if (meta.tags.length >= 2) {
				score += 10;
			}
		}

		if (meta.description) {
			score += 10;
		}
	}

	return Ok(score);
}
