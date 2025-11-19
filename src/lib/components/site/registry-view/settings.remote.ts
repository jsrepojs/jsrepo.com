import { query } from '$app/server';
import * as v from 'valibot';
import { getRegistryPurchasesCount } from '$lib/backend/db/functions.js';

const _getRegistryPurchasesCount = query(
	v.object({
		scope: v.string(),
		registry: v.string()
	}),
	async ({ scope, registry }) => {
		return await getRegistryPurchasesCount({ scope: scope.slice(1), name: registry });
	}
);

export { _getRegistryPurchasesCount as getRegistryPurchasesCount };
