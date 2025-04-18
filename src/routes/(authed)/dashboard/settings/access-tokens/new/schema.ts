import * as v from 'valibot';

export const schema = v.object({
	name: v.pipe(v.string(), v.minLength(1))
});
