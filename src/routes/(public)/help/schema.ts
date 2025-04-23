import * as v from 'valibot';

export const schema = v.object({
	name: v.string(),
	email: v.pipe(v.string(), v.email()),
	reason: v.pipe(v.string(), v.nonEmpty('You must provide a reason')),
	subject: v.pipe(v.string(), v.nonEmpty('You must provide a subject')),
	body: v.pipe(v.string(), v.nonEmpty('You must provide a body'))
});
