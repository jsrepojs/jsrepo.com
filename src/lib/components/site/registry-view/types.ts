import type { RemoteDependency } from '$lib/ts/registry/manifest-v3';
import type { PageData } from '../../../../routes/(public)/[scope=scope]/[name=registryName]/$types';
import * as v from 'valibot';

export const reviewSchema = v.object({
	comment: v.pipe(v.string(), v.nonEmpty('Please enter your comment.')),
	rating: v.pipe(v.number(), v.minValue(1), v.maxValue(5))
});

export type RegistryViewPageData = PageData;

export type RegistryInfo = RegistryInfoV2 | RegistryInfoV3;

export type RegistryInfoV2 = {
	version: 'v2';
	categories: number;
	blocks: number;
	dependencies: string[];
};

export type RegistryInfoV3 = {
	version: 'v3';
	items: number;
	dependencies: RemoteDependency[];
};
