import { STRIPE_SECRET_KEY } from '$env/static/private';
import Stripe from 'stripe';

export const stripeClient = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2025-05-28.basil'
});
