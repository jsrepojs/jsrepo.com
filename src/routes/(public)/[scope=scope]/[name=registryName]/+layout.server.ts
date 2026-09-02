import {
	getMyLicenses,
	getRegistryPrices,
	getUser,
	getVersion,
	hasScopeAccess,
	listMyOrganizations
} from '$lib/backend/db/functions.js';
import { error } from '@sveltejs/kit';
import * as promise from '$lib/ts/promises';

export async function load({ params, locals }) {
	const session = await locals.auth();

	const scopeName = params.scope.slice(1);
	const registryName = params.name;

	const userId = session?.user.id ?? null;

	// anonymous visitors have no orgs, licenses or settings access so don't spend round trips asking
	const [version, hasSettingsAccess, userOrgs, prices, licenses, user] = await promise.allTimed(
		[
			getVersion({
				scopeName,
				registryName,
				version: 'latest',
				userId
			}),
			userId !== null ? hasScopeAccess(userId, scopeName) : false,
			userId !== null ? listMyOrganizations(userId) : [],
			getRegistryPrices({ scopeName, name: registryName }),
			userId !== null ? getMyLicenses(userId) : [],
			userId !== null ? getUser({ id: userId }) : null
		],
		'[name=registryName]/+layout.server.ts'
	);

	if (version === null) error(404);

	return {
		scopeName,
		registryName,
		version,
		hasSettingsAccess,
		userOrgs,
		prices,
		licenses,
		user
	};
}
