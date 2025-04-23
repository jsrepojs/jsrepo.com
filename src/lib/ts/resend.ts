import { RESEND_API_KEY } from '$env/static/private';
import type { APIKey } from '$lib/backend/db/schema';
import { Resend, type CreateEmailOptions } from 'resend';

export const SUPPORT_EMAIL = 'jsrepo.com <support@jsrepo.com>';

export const resend = new Resend(RESEND_API_KEY);

export type MinUser = {
	name: string;
	email: string;
};

export function welcomeEmail(user: MinUser): CreateEmailOptions {
	return {
		from: 'Aidan <support@jsrepo.com>',
		to: [user.email],
		subject: 'Welcome to jsrepo.com',
		html: `<p>Hey ${user.name}!</p>
								
<p>I'm Aidan the creator of jsrepo and I'd like to be the first to welcome you to <a href="https://jsrepo.com">jsrepo.com</a>!</p>

<p><a href="https://jsrepo.com">jsrepo.com</a> is the solution to many of the problems that I have hosting my registries on GitHub and other providers. It's meant to be faster, easier, and just generally more pleasant to use with excellent first-class support from the jsrepo cli.</p>

<p>You can reply to this email with any feedback / questions and I will personally respond!</p>

<p>Now get back to shipping!</p>`
	};
}

export function newVersionPublishedEmail(user: MinUser, name: string, version: string) {
	return {
		from: SUPPORT_EMAIL,
		to: [user.email],
		subject: `Successfully published ${name}@${version}`,
		html: `<p>A new version of ${name} (${version}) was just published at ${new Date().toISOString()}!</p>`
	};
}

export function accessTokenCreatedEmail(user: MinUser, key: APIKey): CreateEmailOptions {
	return {
		from: SUPPORT_EMAIL,
		to: [user.email],
		subject: `New access token created ${key.name}`,
		html: `<p>A new access token has been created (${key.name}) at ${key.createdAt.toISOString()} ${key.expiresAt ? `it is set to expire on ${key.expiresAt.toISOString()}` : ''}.</p>

<p>You can manage your tokens <a href="https://jsrepo.com/account/access-tokens">here</a>.</p>`
	};
}

export function supportEmail(opts: {
	name: string;
	email: string;
	subject: string;
	body: string;
	reason: string;
}): CreateEmailOptions {
	return {
		from: `${opts.name} <users@jsrepo.com>`,
		to: [SUPPORT_EMAIL],
		replyTo: `${opts.name} <${opts.email}>`,
		subject: opts.subject,
		html: `[${opts.reason}] ${opts.body}`,
		tags: [
			{
				name: 'support',
				value: opts.reason
			}
		]
	};
}

export function scopeTransferredRequestedEmail(opts: {
	scopeName: string;
	newOwner: MinUser;
	oldOwner: MinUser;
	newOrg?: string;
}): CreateEmailOptions {
	return {
		from: SUPPORT_EMAIL,
		to: [opts.newOwner.email],
		subject: `@${opts.scopeName} transfer request`,
		html: `<p>${opts.oldOwner.name} wants to transfer ${opts.scopeName} to ${opts.newOrg ? opts.newOrg : opts.newOwner.name}.</p>
		
<p>View and confirm the request on <a href="https://jsrepo.com/account/scopes">jsrepo.com</a></p>`
	};
}

export function scopeTransferredRequestedEmailToOldOwner(opts: {
	scopeName: string;
	newOwner: MinUser;
	oldOwner: MinUser;
	newOrg?: string;
}): CreateEmailOptions {
	return {
		from: SUPPORT_EMAIL,
		to: [opts.newOwner.email],
		subject: `@${opts.scopeName} transfer request submitted`,
		html: `<p>You have submitted to transfer @${opts.scopeName} to ${opts.newOrg ? opts.newOrg : opts.newOwner.name}.</p>
		
<p>View and cancel this request on <a href="https://jsrepo.com/@${opts.scopeName}">jsrepo.com</a> until it has been accepted.</p>`
	};
}

export function scopeTransferredEmail(opts: {
	scopeName: string;
	newOwner: MinUser;
	newOrg?: string;
}): CreateEmailOptions {
	return {
		from: SUPPORT_EMAIL,
		to: [opts.newOwner.email],
		subject: `@${opts.scopeName} now belongs to ${opts.newOrg ? opts.newOrg : 'you'}!`,
		html: `<p>@${opts.scopeName} has been transferred to ${opts.newOrg ? opts.newOrg : 'you'}!</p>
		
<p>Check out your shiny new scope at <a href="https://jsrepo.com/@${opts.scopeName}">jsrepo.com</a></p>`
	};
}
