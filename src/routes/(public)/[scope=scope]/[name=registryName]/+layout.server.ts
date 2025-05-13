import {
	getMyLicenses,
	getRegistryPrices,
	getRegistryPurchasesCount,
	getUser,
	getVersion,
	hasScopeAccess,
	listMyOrganizations
} from '$lib/backend/db/functions.js';
import { error } from '@sveltejs/kit';

export async function load({ params, locals }) {
	const session = await locals.auth();

	const scopeName = params.scope.slice(1);
	const registryName = params.name;

	const [version, hasAccess, userOrgs, prices, licenses, user, purchases] = await Promise.all([
		getVersion({
			scopeName,
			registryName,
			version: 'latest',
			userId: session?.user.id ?? null
		}),
		hasScopeAccess(session?.user.id ?? null, scopeName),
		listMyOrganizations(session?.user.id ?? ''),
		getRegistryPrices({ scopeName, name: registryName }),
		getMyLicenses(session?.user.id ?? ''),
		getUser({ id: session?.user.id ?? '' }),
		getRegistryPurchasesCount({ scope: scopeName, name: registryName })
	]);

	if (version === null) error(404);

	return {
		scopeName,
		registryName,
		version,
		hasAccess,
		userOrgs,
		prices,
		licenses,
		user,
		purchases
	};
}
