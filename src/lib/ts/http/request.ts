import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import * as vercel from '@vercel/functions';

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

export async function waitUntil(p: (() => Promise<unknown>) | Promise<unknown>) {
	let promise: Promise<unknown>;

	if (typeof p === 'function') {
		promise = p();
	} else {
		promise = p;
	}

	vercel.waitUntil(promise);
}
