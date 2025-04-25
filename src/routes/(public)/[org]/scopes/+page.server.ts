import { getOrgScopes } from '$lib/backend/db/functions.js';

export async function load({ params }) {
	const orgName = params.org;

	const scopes = await getOrgScopes(orgName);

    return {
        scopes
    }
}
