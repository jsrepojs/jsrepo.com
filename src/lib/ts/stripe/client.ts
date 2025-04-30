import { PUBLIC_STRIPE_PRODUCTION } from '$env/static/public';
import type { UserWithSubscription } from '$lib/backend/db/functions';
import type { Subscription } from '$lib/backend/db/schema';
import { YEAR } from '../time';

export type Plan = {
	name: string;
	priceId: string;
};

export const PLANS = {
	pro: {
		name: 'Pro',
		priceId: variable('price_1RJF3VG0c645Pxpo6NTpErOA', 'price_1RJJAP4UV8VP8UhvzcLHFYx3')
	} satisfies Plan,
	organizationSeat: {
		name: 'Organization Seat',
		priceId: variable('price_1RJfTTG0c645PxpoK5P1taiR', 'price_1RJfSa4UV8VP8UhvzKjbBS25')
	} satisfies Plan
} as const;

export type PlanName = keyof typeof PLANS;

export const plans = Object.entries(PLANS).map(([_, plan]) => plan);

export function checkUserSubscription(user: UserWithSubscription): PlanName | null {
	if (user.subscription !== null) {
		if (user.subscription.status !== 'active') return null;

		return user.subscription.plan as PlanName;
	}

	return null;
}

export function variable(prod: string, dev: string) {
	if (PUBLIC_STRIPE_PRODUCTION === '1') {
		return prod;
	}

	return dev;
}

export function period(subscription: Subscription | null): 'monthly' | 'yearly' | null {
	if (subscription === null) return null;

	if (subscription.status !== 'active') return null;

	if (subscription.periodStart === null || subscription.periodEnd === null) {
		return null;
	}

	if (subscription.periodEnd.valueOf() - subscription.periodStart.valueOf() >= YEAR) {
		return 'yearly';
	}

	return 'monthly';
}
