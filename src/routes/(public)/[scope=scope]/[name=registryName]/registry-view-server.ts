import {
	canLeaveReview,
	getFiles,
	getRegistry,
	getVersions,
	getWeeklyDownloadsForLastYear,
	leaveReview,
	type RegistryDetails,
	type WeeklyDownloads
} from '$lib/backend/db/functions';
import { manifestSchema, type Manifest } from '$lib/ts/registry/manifest';
import * as tables from '$lib/backend/db/schema';
import * as v from 'valibot';
import DOMPurify from 'isomorphic-dompurify';
import { rehype } from '$lib/ts/markdown';
import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { reviewSchema } from '$lib/components/site/registry-view/types';
import type { Action } from './$types';
import assert from 'assert';
import * as promise from '$lib/ts/promises';

export type Options = {
	scopeName: string;
	registryName: string;
	version: string;
	userId: string | null;
};

export type Info = {
	readme: string | null;
	manifest: Manifest;
	versions: tables.Version[];
	registry: RegistryDetails;
	weeklyDownloads: Promise<WeeklyDownloads[]>;
};

export async function getInfo({
	scopeName,
	registryName,
	version,
	userId
}: Options): Promise<Info | null> {
	const registryPromise = promise.timed(
		getRegistry({ scopeName, registryName, userId }),
		'getRegistry - registryPromise'
	);

	const weeklyDownloads = getWeeklyDownloadsForLastYear({
		scope: scopeName,
		registry: registryName
	});

	const promises = promise.allTimed(
		[
			getVersions(scopeName, registryName),
			getFiles({
				userId,
				scopeName,
				registryName,
				version,
				readonlyAccess: true,
				fileNames: ['README.md', 'jsrepo-manifest.json']
			})
		],
		`@${scopeName}/${registryName} - getInfo - promises`
	);

	const registry = await registryPromise;

	// here we'd return 404 because the registry doesn't exist or the user doesn't have access
	if (!registry) return null;

	const [versions, files] = await promises;

	let readme = files.find((f) => f.name === 'README.md')?.content ?? null;
	const manifestContent = files.find((f) => f.name === 'jsrepo-manifest.json')?.content;

	if (manifestContent === undefined) return null;
	if (!versions || versions.length === 0) return null;

	if (readme !== null) {
		const html = (await rehype(readme)).toString();

		readme = DOMPurify.sanitize(html);
	}

	return {
		readme,
		manifest: v.parse(manifestSchema, JSON.parse(manifestContent)),
		registry,
		versions,
		weeklyDownloads
	};
}

const review: Action = async ({ request, locals, params }) => {
	const form = await superValidate(request, valibot(reviewSchema));

	if (!form.valid) {
		return fail(400, { form });
	}

	const session = await locals.auth();

	if (!session) return fail(401);

	const scopeName = params.scope.slice(1);
	const registryName = params.name;

	const [authorized, registry] = await Promise.all([
		canLeaveReview({
			userId: session?.user.id,
			scope: params.scope.slice(1),
			registry: params.name
		}),
		getRegistry({ scopeName, registryName, userId: session?.user.id ?? null })
	]);

	if (!authorized) return fail(401);

	assert(registry !== null, 'registry must be defined');

	// create review

	const result = await leaveReview({
		...form.data,
		registryId: registry.id,
		userId: session?.user.id
	});

	if (!result) return fail(500, { message: 'error leaving review' });

	return message(form, 'Success');
};

export const actions = {
	review
};
