import { NAME_REGEX } from '$lib/ts/registry/name';
import * as v from 'valibot';

export const schema = v.object({
	name: v.pipe(v.string(), v.minLength(1), v.regex(NAME_REGEX, 'Invalid name for the scope'))
});
