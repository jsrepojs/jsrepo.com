import { NAME_REGEX } from '$lib/ts/registry/name';

export function match(param: string) {
	return param.match(NAME_REGEX);
}
