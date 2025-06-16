import { dev } from '$app/environment';
import { PostHog } from 'posthog-node';

export const posthog = new PostHog('phc_rcol9BwzfWp2rDkXW8WW3okjdnUrDyxpT1zhZxtG07f', {
	host: 'https://us.i.posthog.com',
	disabled: dev
});
