import { error } from '@sveltejs/kit';
import * as v from 'valibot';

export async function validateRequest<
	T extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>
>(schema: T, request: Request): Promise<v.InferOutput<T>> {
	try {
		const json = await request.json();

		const result = v.safeParse(schema, json);

		if (!result.success) {
			error(400, result.issues.map((err) => `${err.message}`).join(' | '));
		}

		return result.output;
	} catch {
		error(400, 'expected json request body');
	}
}
