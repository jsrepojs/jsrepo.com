import type { Block } from './manifest';
import * as array from '$lib/ts/array';

/** Parses the file extension `test.ts` -> `ts`
 *
 * @param file
 * @returns
 */
export function parseFileExtension(file: string) {
	const index = file.lastIndexOf('.');

	return file.slice(index + 1);
}

export function determinePrimaryLanguage(...blocks: Block[]) {
	const langMap = new Map<string, number>();

	const ifExistsIncrement = (key: string) => {
		const val = langMap.get(key) ?? 0;

		langMap.set(key, val + 1);
	};

	for (const block of blocks) {
		for (const file of block.files) {
			const ext = parseFileExtension(file);

			if (ext === 'yaml' || ext === 'yml') {
				ifExistsIncrement('yml');
				continue;
			}

			if (ext === 'json' || ext === 'jsonc') {
				ifExistsIncrement('json');
				continue;
			}

			if (ext === 'sass' || ext === 'scss') {
				ifExistsIncrement('sass');
				continue;
			}

			if (blocks.length === 1) {
				if (ext === 'svelte' || ext === 'tsx' || ext === 'jsx' || ext === 'vue') return ext;
			}

			ifExistsIncrement(ext);
		}
	}

	const arr = array
		.fromMap(langMap, (key, value) => ({ key, value }))
		.toSorted((a, b) => b.value - a.value);

	return arr[0]?.key ?? 'unknown';
}
