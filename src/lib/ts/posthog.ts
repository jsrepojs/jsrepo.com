import { PostHog } from 'posthog-node'

export const postHogClient = new PostHog(
    'phc_rcol9BwzfWp2rDkXW8WW3okjdnUrDyxpT1zhZxtG07f',
    {
        host: 'https://us.i.posthog.com'
    }
)