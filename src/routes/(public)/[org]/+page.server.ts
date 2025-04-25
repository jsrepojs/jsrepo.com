import { redirect } from '@sveltejs/kit';

export async function load({ params }) {
	redirect(303, `/${params.org}/registries`);
}
