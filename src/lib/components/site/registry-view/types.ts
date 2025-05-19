import type { PageData } from '../../../../routes/(public)/[scope=scope]/[name=registryName]/$types';
import * as v from 'valibot';

export const reviewSchema = v.object({
	comment: v.pipe(v.string(), v.nonEmpty('Please enter your comment.')),
	rating: v.pipe(v.number(), v.minValue(1), v.maxValue(5))
});

export type RegistryViewPageData = PageData;
