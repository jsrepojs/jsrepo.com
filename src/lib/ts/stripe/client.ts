import type { UserWithSubscription } from '$lib/backend/db/functions';

export type Plan = {
	name: string;
	priceId: string;
	annualDiscountPriceId: string;
};

const PLANS = {
	Pro: {
		name: 'Pro',
		priceId: 'price_1RJF3VG0c645Pxpo6NTpErOA',
		annualDiscountPriceId: 'price_1RJF3VG0c645PxpoRlweHNVy'
	} satisfies Plan,
	Team: {
		name: 'Team',
		priceId: 'price_1RJFCiG0c645PxpotNsQsGb7',
		annualDiscountPriceId: 'price_1RJFCiG0c645PxpocZlguo25'
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
