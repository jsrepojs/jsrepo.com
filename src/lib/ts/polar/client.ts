export const PRO_PRODUCT_ID = "bc7107a1-4c47-4564-a33b-2d07d0004fe3"
export const TEAM_PRODUCT_ID = "ad93a6c3-fbc8-4f3d-9e7e-e344d88de1bc";

type Subscription = "Pro" | "Team";

export function activeSubscription(productId: string | null, endsAt: Date | null): Subscription | null {
    if (productId === null) return null

    if (endsAt !== null && endsAt?.valueOf() < Date.now()) {
        return null
    }

    if (productId === PRO_PRODUCT_ID) return "Pro";
    
    if (productId === TEAM_PRODUCT_ID) return "Team";

    return null;
}