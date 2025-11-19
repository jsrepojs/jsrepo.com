import { getRequestEvent, query } from '$app/server';
import {
	canLeaveReview,
	getRegistryRatings,
	getReviews,
	type RegistryRatings
} from '$lib/backend/db/functions';
import type { RegistryReview } from '$lib/backend/db/schema';
import * as v from 'valibot';

export type ReviewsViewData = {
	ratings: RegistryRatings;
	reviews: RegistryReview[];
	canReview: boolean;
};

const _getRegistryRatings = query(
	v.object({
		scope: v.string(),
		registry: v.string()
	}),
	async ({ scope, registry }) => {
		return await getRegistryRatings({ scope: scope.slice(1), registry });
	}
);

export { _getRegistryRatings as getRegistryRatings };

const _getReviews = query(
	v.object({
		scope: v.string(),
		registry: v.string(),
		limit: v.optional(v.number()),
		offset: v.optional(v.number())
	}),
	async ({ scope, registry, limit = 5, offset = 0 }) => {
		return await getReviews({ scope: scope.slice(1), registry, limit, offset });
	}
);

export { _getReviews as getReviews };

export const getCanLeaveReviews = query(
	v.object({
		scope: v.string(),
		registry: v.string()
	}),
	async ({ scope, registry }) => {
		const { locals } = getRequestEvent();
		const session = await locals.auth();
		return await canLeaveReview({
			userId: session?.user.id,
			scope: scope.slice(1),
			registry
		});
	}
);
