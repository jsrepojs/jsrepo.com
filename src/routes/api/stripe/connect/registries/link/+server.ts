import {
	canPublishToScope,
	getRegistry,
	getUser,
	linkAccountToRegistry
} from '$lib/backend/db/functions.js';
import { validateRequest } from '$lib/ts/http/request.js';
import { error, json } from '@sveltejs/kit';
import assert from 'assert';
import * as v from 'valibot';

const schema = v.object({
	registryId: v.number()
});

export type LinkAccountToRegistryRequest = v.InferOutput<typeof schema>;

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

	if (user.stripeSellerAccountId === null)
		error(
			400,
			'you need to setup your stripe connect account before trying to link it to registries'
		);

	if (registry.connectedStripeAccount !== null) {
		error(400, 'there is already a stripe account connected');
	}

	const canLink = await canPublishToScope(user, registry.scope);

	if (!canLink.canPublish) error(401, 'you are not allowed to link your account to this registry');

	const result = await linkAccountToRegistry(registry.id, user.stripeSellerAccountId);

	if (!result) error(500, 'error linking your account to the registry');

	return json({});
}
