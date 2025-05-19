import {
	canLeaveReview,
	getMyLicenses,
	getRegistryPrices,
	getRegistryPurchasesCount,
	getUser,
	getVersion,
	hasScopeAccess,
	listMyOrganizations,
	getReviews,
	getRegistryRatings
} from '$lib/backend/db/functions.js';
import { error } from '@sveltejs/kit';

export async function load({ params, locals }) {
	const session = await locals.auth();

	const scopeName = params.scope.slice(1);
	const registryName = params.name;

	const ratings = getRegistryRatings({ scope: scopeName, registry: registryName });

	const [
		version,
		hasSettingsAccess,
		userOrgs,
		prices,
		licenses,
		user,
		purchases,
		reviews,
		canReview
	] = await Promise.all([
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
		getRegistryPurchasesCount({ scope: scopeName, name: registryName }),
		getReviews({ scope: scopeName, registry: registryName, limit: 5, offset: 0 }),
		canLeaveReview({ userId: session?.user.id, scope: scopeName, registry: registryName })
	]);

	if (version === null) error(404);

	return {
		scopeName,
		registryName,
		version,
		hasSettingsAccess,
		userOrgs,
		prices,
		licenses,
		user,
		purchases,
		reviews,
		canLeaveReview: canReview,
		ratings
	};
}
