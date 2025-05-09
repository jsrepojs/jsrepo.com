import { RESEND_API_KEY } from '$env/static/private';
import type { APIKey } from '$lib/backend/db/schema';
import { Resend, type CreateEmailOptions } from 'resend';
import { htmlToText } from 'html-to-text';

export const SUPPORT_EMAIL = 'jsrepo.com <support@jsrepo.com>';

export const resend = new Resend(RESEND_API_KEY);

export type MinUser = {
	name: string;
	email: string;
};

export function welcomeEmail(user: MinUser): CreateEmailOptions {
	const html = `<p>Hey ${user.name}!</p>
								
<p>I'm Aidan the creator of jsrepo and I'd like to be the first to welcome you to <a href="https://jsrepo.com">jsrepo.com</a>!</p>

<p><a href="https://jsrepo.com">jsrepo.com</a> is the solution to many of the problems that I have hosting my registries on GitHub and other providers. It's meant to be faster, easier, and just generally more pleasant to use with excellent first-class support from the jsrepo cli.</p>

<p>You can reply to this email with any feedback / questions and I will personally respond!</p>

<p>Now get back to shipping!</p>`;

	return {
		from: 'Aidan <support@jsrepo.com>',
		to: [user.email],
		subject: 'Welcome to jsrepo.com',
		html,
		text: htmlToText(html)
	};
}

export function newVersionPublishedEmail(
	user: MinUser,
	name: string,
	version: string
): CreateEmailOptions {
	const date = new Date().toISOString();
	const html = `<p>A new version of ${name} (${version}) was just published at ${date}!</p>`;

	return {
		from: SUPPORT_EMAIL,
		to: [user.email],
		subject: `Successfully published ${name}@${version}`,
		html,
		text: htmlToText(html)
	};
}

export function accessTokenCreatedEmail(user: MinUser, key: APIKey): CreateEmailOptions {
	const html = `<p>A new access token has been created (${key.name}) at ${key.createdAt.toISOString()} ${key.expiresAt ? `it is set to expire on ${key.expiresAt.toISOString()}` : ''}.</p>

<p>You can manage your tokens <a href="https://jsrepo.com/account/access-tokens">here</a>.</p>`;

	return {
		from: SUPPORT_EMAIL,
		to: [user.email],
		subject: `New access token created ${key.name}`,
		html,
		text: htmlToText(html)
	};
}

export function supportEmail(opts: {
	name: string;
	email: string;
	subject: string;
	body: string;
	reason: string;
}): CreateEmailOptions {
	const html = `[${opts.reason}] ${opts.body}`;

	return {
		from: `${opts.name} <users@jsrepo.com>`,
		to: [SUPPORT_EMAIL],
		replyTo: `${opts.name} <${opts.email}>`,
		subject: opts.subject,
		html,
		text: htmlToText(html),
		tags: [
			{
				name: 'support',
				value: opts.reason
			}
		]
	};
}

export function scopeTransferRequestedEmail(opts: {
	scopeName: string;
	newOwner: MinUser;
	oldOwner: MinUser & { username: string | null };
	newOwnerName: string;
}): CreateEmailOptions {
	const html = `<p>${opts.oldOwner.username ?? opts.oldOwner.name} wants to transfer @${opts.scopeName} to ${opts.newOwnerName}.</p>
		
<p>View and confirm the request on <a href="https://jsrepo.com/account/scopes/transfer-requests">jsrepo.com</a></p>`;

	return {
		from: SUPPORT_EMAIL,
		to: [opts.newOwner.email],
		subject: `@${opts.scopeName} transfer request`,
		html,
		text: htmlToText(html)
	};
}

export function scopeTransferRequestedEmailToOldOwner(opts: {
	scopeName: string;
	oldOwner: MinUser;
	newOwnerName: string;
}) {
	const html = `<p>You have submitted to transfer @${opts.scopeName} to ${opts.newOwnerName}.</p>
		
<p>View and cancel this request on <a href="https://jsrepo.com/@${opts.scopeName}/-/settings">jsrepo.com</a> until it has been accepted.</p>`;

	return {
		from: SUPPORT_EMAIL,
		to: [opts.oldOwner.email],
		subject: `@${opts.scopeName} transfer request submitted`,
		html,
		text: htmlToText(html)
	};
}

export function scopeTransferredEmail(opts: {
	scopeName: string;
	newOwner: MinUser;
	newOwnerName: string;
}): CreateEmailOptions {
	const html = `<p>@${opts.scopeName} has been transferred to ${opts.newOwnerName ? opts.newOwnerName : 'you'}!</p>
		
<p>Check out your shiny new scope at <a href="https://jsrepo.com/@${opts.scopeName}">jsrepo.com</a></p>`;

	return {
		from: SUPPORT_EMAIL,
		to: [opts.newOwner.email],
		subject: `@${opts.scopeName} now belongs to ${opts.newOwnerName}!`,
		html,
		text: htmlToText(html)
	};
}

export function invitedToOrgEmail(opts: {
	owner: MinUser & { username: string | null };
	invited: string;
	orgName: string;
}): CreateEmailOptions {
	const html = `<p>${opts.owner.username ?? opts.owner.name} invited you to join ${opts.orgName}!</p>
	
<p>View and accept your invitation on <a href="https://jsrepo.com/account/organizations/invites">jsrepo.com</a></p>`;

	return {
		from: SUPPORT_EMAIL,
		to: [opts.invited],
		subject: `${opts.owner.username} invited you to join ${opts.orgName}!`,
		html,
		text: htmlToText(html)
	};
}

export function marketplaceNextStepsEmail(user: MinUser, registryName: string): CreateEmailOptions {
	const html = `<p>Congrats on publishing ${registryName}!</p>
	
<p>Here's a few things you need to do before you continue...</p>

<ol>
	<li>Link your stripe account in your organization or user settings to receive payments</li>
	<li>Configure the price for your registry in the registry settings</li>
</ol>

<p>Happy Shipping!</p>`;

	return {
		from: SUPPORT_EMAIL,
		to: [user.email],
		subject: `${registryName} marketplace configuration`,
		html,
		text: htmlToText(html)
	};
}
