import { NAME_REGEX } from '$lib/ts/registry/name';

export function match(param: string) {
	return param.startsWith('@') && param.slice(1).match(NAME_REGEX);
}
