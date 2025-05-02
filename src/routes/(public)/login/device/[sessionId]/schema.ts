import * as v from 'valibot';

export const schema = v.object({
	code: v.pipe(v.string(), v.length(6))
});
