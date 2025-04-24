import type { Org, Scope, User } from './schema';

/** Returns true if the user email or org name is the current owner of the scope
 *
 * @param userOrOrg
 * @param opts
 * @returns
 */
export function isSameScopeOwner(
	userOrOrg: string,
	opts: { scope: Scope; user: User; org: Org | null }
): boolean {
	// error for self transfers
	if (opts.scope.orgId !== null) {
		if (opts.org?.name === userOrOrg) {
			return true;
		}
	} else if (opts.scope.userId !== null) {
		if (opts.user.email === userOrOrg) {
			return true;
		}
	}

	return false;
}

export function getOwnerName(opts: { scope: Scope; user: User; org: Org | null }): string {
	if (opts.scope.orgId !== null) {
		if (opts.org === null) {
			throw new Error('org must be defined');
		}

		return opts.org.name;
	} else {
		return opts.user.name!;
	}
}
