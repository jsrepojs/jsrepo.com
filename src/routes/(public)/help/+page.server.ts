import { auth } from '$lib/auth.js';
import { supportFormRateLimit } from '$lib/ts/redis.js';
import { error, fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import { schema } from './schema.js';
import { toRelative } from '$lib/ts/dates.js';
import { resend, supportEmail } from '$lib/ts/resend.js';
import { dev } from '$app/environment';

export async function load({ request }) {
	const session = await auth.api.getSession({ headers: request.headers });

	const form = await superValidate(valibot(schema));

	return {
		session,
		form
	};
}

export const actions = {
	default: async ({ getClientAddress, request }) => {
		// don't count towards rate limit in dev mode
		if (!dev) {
			const { success, reset } = await supportFormRateLimit.limit(getClientAddress());

			if (!success) {
				error(
					429,
					`We'd love to help but the amount of requests you have made is a bit excessive try again ${toRelative(new Date(reset))}.`
				);
			}
		}

		const form = await superValidate(request, valibot(schema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const session = await auth.api.getSession({ headers: request.headers });

		const name = session?.user.name ?? form.data.name;
		const email = session?.user.email ?? form.data.email;
		const subject = form.data.subject;
		const body = form.data.body;
		const reason = form.data.reason;

		const { error: err } = await resend.emails.create(
			supportEmail({ name, email, subject, body, reason })
		);

		if (err) {
			error(500, 'There was an error processing your request');
		}

		return message(form, { message: 'success' });
	}
};
