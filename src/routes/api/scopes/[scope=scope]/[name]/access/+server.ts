import {
	canPublishToScope,
	getRegistry,
	getRegistryPurchasesCount,
	getScope,
	getUser
} from '$lib/backend/db/functions.js';
import { db } from '$lib/backend/db/index.js';
import { validateRequest } from '$lib/ts/http/request.js';
import { error, json } from '@sveltejs/kit';
import * as v from 'valibot';
import * as tables from '$lib/backend/db/schema';
import { eq } from 'drizzle-orm';
import assert from 'assert';

const schema = v.object({
	access: v.union([v.literal('public'), v.literal('private'), v.literal('marketplace')])
});

export type UpdateRegistryAccessRequest = v.InferOutput<typeof schema>;

export async function PATCH({ request, locals, params }) {
	const body = await validateRequest(schema, request);

	const scopeName = params.scope.slice(1);
	const { name } = params;

	const session = await locals.auth();

	if (!session) error(401);

	const [user, scope, registry, purchases] = await Promise.all([
		getUser({ id: session.user.id }),
		getScope(scopeName),
		getRegistry({ scopeName, registryName: name, userId: session.user.id }),
		getRegistryPurchasesCount({ scope: scopeName, name })
	]);

	assert(user !== null, 'user must be defined');

	if (scope === null) error(404);

	if (!registry) error(404);

	if (purchases > 0 && body.access === 'private') {
		error(400, 'you cannot make a purchased registry private');
	}

	const canPublish = await canPublishToScope(user, scope);

	if (!canPublish.canPublish)
		error(401, 'only users with publish access can change the access level');

	if (body.access === registry.access) return json({});

	const result = await db
		.update(tables.registry)
		.set({ access: body.access })
		.where(eq(tables.registry.id, registry.id))
		.returning();

	if (result.length === 0) error(500, 'error updating registry access');

	return json({});
}
