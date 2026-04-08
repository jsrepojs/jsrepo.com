import { getOrg, getOrgShellByName } from '$lib/backend/db/functions.js';
import { error } from '@sveltejs/kit';

export async function load({ params, locals, url }) {
	const session = await locals.auth();

	const base = `/${params.org}`;
	const onOrgLanding = url.pathname === base || url.pathname === `${base}/`;

	if (onOrgLanding) {
		const org = await getOrgShellByName(params.org);
		if (!org) error(404);
		// `/[org]` redirects in +page; skip full member join.
		return { org, member: null };
	}

	const org = await getOrg({ name: params.org });

	if (!org) error(404);

	const member = org.members.find((m) => m.userId === session?.user.id);

	return {
		org,
		member: member ?? null
	};
}
