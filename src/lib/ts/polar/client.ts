import { PUBLIC_POLAR_PRODUCTION } from '$env/static/public';

export const PRO_PRODUCT_ID = polarEnvironmentVariable<string>(
	'ff08eced-537a-4ff5-96b3-12c1f32f4566',
	'bc7107a1-4c47-4564-a33b-2d07d0004fe3'
);

export const TEAM_PRODUCT_ID = polarEnvironmentVariable<string>(
	'8fc443bf-b6db-4239-94f6-b42fa8b2c7f2',
	'ad93a6c3-fbc8-4f3d-9e7e-e344d88de1bc'
);

export type Subscription = 'Pro' | 'Team';

export function activeSubscription(
	productId: string | null,
	endsAt: Date | null
): Subscription | null {
	if (productId === null) return null;

	if (endsAt !== null && endsAt < new Date()) {
		return null;
	}

	if (productId === PRO_PRODUCT_ID) return 'Pro';

	if (productId === TEAM_PRODUCT_ID) return 'Team';

	return null;
}

export function polarEnvironment(): 'sandbox' | 'production' {
	return PUBLIC_POLAR_PRODUCTION === '1' ? 'production' : 'sandbox';
}

/** Changes the active variable based on the deployment environment */
export function polarEnvironmentVariable<T>(production: T, sandbox: T): T {
	const environment = polarEnvironment();

	if (environment === 'production') return production;

	return sandbox;
}

export function checkUserSubscription(user: {
	polarSubscriptionPlanId: string | null;
	polarSubscriptionPlanEnd: Date | null;
}): Subscription | null {
	return activeSubscription(user.polarSubscriptionPlanId, user.polarSubscriptionPlanEnd);
}
