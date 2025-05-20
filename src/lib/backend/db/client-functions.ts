import type { Org, Scope, User } from './schema';

/** Returns true if the user email or org name is the current owner of the scope
 *
 * @param userOrOrg
 * @param opts
 * @returns
 */
export function isSameScopeOwner(
	userOrOrg: string,
	opts: Scope & { user: User | null; org: Org | null }
): boolean {
	// error for self transfers
	if (opts.orgId !== null) {
		if (opts.org?.name === userOrOrg) {
			return true;
		}
	} else if (opts.user !== null) {
		if (opts.user.email === userOrOrg) {
			return true;
		}
	}

	return false;
}

export function getOwnerName(opts: { scope: Scope; user: User | null; org: Org | null }): string {
	if (opts.scope.orgId !== null) {
		if (opts.org === null) {
			throw new Error('org must be defined');
		}

		return opts.org.name;
	} else {
		if (opts.user === null) {
			throw new Error('must be defined');
		}

		return opts.user.name;
	}
}

export type PublicUser = {
	id: string;
	name: string;
	createdAt: Date;
	username: string | null;
	image: string | null;
};

export function publicUser(user: User | null): PublicUser | null {
	if (user === null) return null

	return {
		id: user.id,
		name: user.name,
		createdAt: user.createdAt,
		image: user.image,
		username: user.username
	} satisfies PublicUser;
}
