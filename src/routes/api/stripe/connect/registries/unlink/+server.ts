import {
	canPublishToScope,
	getRegistry,
	getUser,
	unlinkAccountFromRegistry
} from '$lib/backend/db/functions.js';
import { validateRequest } from '$lib/ts/http/request.js';
import { error, json } from '@sveltejs/kit';
import assert from 'assert';
import * as v from 'valibot';

const schema = v.object({
	registryId: v.number()
});

export type UnlinkAccountFromRegistryRequest = v.InferOutput<typeof schema>;

export async function PATCH({ locals, request }) {
	const body = await validateRequest(schema, request);

	const session = await locals.auth();

	if (!session) error(401);

	const [registry, user] = await Promise.all([
		getRegistry({ registryId: body.registryId, userId: session.user.id }),
		getUser({ id: session.user.id })
	]);

	assert(user !== null, 'user must be defined');

	if (registry === null) error(404);

	if (registry.stripeConnectAccountId !== user.stripeSellerAccountId) {
		error(400, 'you are not the currently linked account');
	}

	const canLink = await canPublishToScope(user, registry.scope);

	if (!canLink.canPublish) error(401, 'you are not allowed to link your account to this registry');

	const result = await unlinkAccountFromRegistry(registry.id);

	if (!result) error(500, 'error unlinking your account from the registry');

	return json({});
}
