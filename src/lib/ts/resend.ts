import { RESEND_API_KEY } from '$env/static/private';
import { Resend, type CreateEmailOptions } from 'resend';

export const resend = new Resend(RESEND_API_KEY);

export function welcomeEmail(user: { name: string, email: string }): CreateEmailOptions {
	return {
        from: 'Aidan <aidan@jsrepo.com>',
		to: [user.email],
		subject: 'Welcome to jsrepo.com',
		html: `<p>Hey ${user.name}!</p>
								
<p>I'd like to be the first to welcome you to <a href="https://jsrepo.com">jsrepo.com</a>!</p>

<p><a href="https://jsrepo.com">jsrepo.com</a> is the solution to many of the problems that I have hosting my registries on GitHub and other providers. It's meant to be faster, easier, and just generally more pleasant to use with excellent first-class support from the jsrepo cli.</p>

<p>You can reply to this email with any feedback / questions and I will personally respond!</p>

<p>Now get back to shipping!</p>

<p>- Aidan</p>`
	};
}
