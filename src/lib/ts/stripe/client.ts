import { PUBLIC_STRIPE_PRODUCTION } from '$env/static/public';
import type { UserWithSubscription } from '$lib/backend/db/functions';

export type Plan = {
	name: string;
	priceId: string;
	annualDiscountPriceId: string;
};

const PLANS = {
	pro: {
		name: 'Pro',
		priceId: variable('price_1RJF3VG0c645Pxpo6NTpErOA', 'price_1RJJAP4UV8VP8UhvzcLHFYx3'),
		annualDiscountPriceId: variable(
			'price_1RJF3VG0c645PxpoRlweHNVy',
			'price_1RJJAP4UV8VP8UhvGZGgEMWC'
		)
	} satisfies Plan,
	team: {
		name: 'Team',
		priceId: variable('price_1RJFCiG0c645PxpotNsQsGb7', 'price_1RJJET4UV8VP8UhvFR19MZyW'),
		annualDiscountPriceId: variable(
			'price_1RJFCiG0c645PxpocZlguo25',
			'price_1RJJET4UV8VP8UhvntbtZXd8'
		)
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
