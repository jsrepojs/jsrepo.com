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
	listOnMarketplace: v.boolean()
});

export type ListOnMarketplaceRequest = v.InferOutput<typeof schema>;

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

	if (purchases > 0 && body.listOnMarketplace === false) {
		error(400, 'cannot un-list purchased registries');
	}

	const canPublish = await canPublishToScope(user, scope, registry.access);

	if (!canPublish.canPublish) error(401, 'only users with publish access can list on marketplace');

	if (body.listOnMarketplace === registry.listOnMarketplace) return json({});

	const result = await db
		.update(tables.registry)
		.set({ listOnMarketplace: body.listOnMarketplace })
		.where(eq(tables.registry.id, registry.id))
		.returning();

	if (result.length === 0) error(500, 'error updating list on marketplace');

	return json({});
}
