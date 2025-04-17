import { extract, streamToBuffer } from '$lib/ts/tarz';
import { error, json } from '@sveltejs/kit';

export async function POST({ request }) {
	if (request.body === null) {
		error(400, 'body is required');
	}

	if (request.headers.get('content-type') !== 'application/gzip') {
		error(400, 'invalid content-type expected `application/gzip`');
	}

	const files = (await extract(await streamToBuffer(request.body))).match(
		(val) => val,
		(err) => error(500, `error extracting files ${err}`)
	);

	const manifest = files.find((f) => f.name === 'jsrepo-manifest.json');

	if (!manifest) {
		error(400, 'could not find your jsrepo-manifest.json');
	}

    console.log(manifest)

	return json({});
}
