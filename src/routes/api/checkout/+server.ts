import { POLAR_ACCESS_TOKEN } from '$env/static/private'
import { Checkout } from '@polar-sh/sveltekit'

export const GET = Checkout({
    accessToken: POLAR_ACCESS_TOKEN,
    successUrl: '/account',
    server: 'sandbox'
})