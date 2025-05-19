import type { RegistryPrice } from '$lib/backend/db/schema';

export const MIN_PRICE = 5;
export const MAX_PRICE = 1000;

/** 5% + 30¢
 *
 * @param transactionCost cost in cents
 * @returns
 */
export function calculatePlatformFee(transactionCost: number) {
	return Math.ceil(transactionCost * 0.05 + 30);
}

/** Calculates the price with discount (if there was one) */
export function calculateDiscountedPrice(price: RegistryPrice): {
	discount: number | null;
	price: number;
} {
	// no discount
	if (price.discount === null) return { discount: null, price: price.cost };

	// discount expired
	if (price.discountUntil && price.discountUntil?.valueOf() < Date.now())
		return { discount: null, price: price.cost };

	// ex: 30% discount to price
	//
	//   $100 - ($100 * (30 / 100))
	//   $100 - ($100 * 0.30)
	//   $100 - $30
	//   $70

	return {
		discount: price.discount,
		price: Math.ceil(price.cost - price.cost * (price.discount / 100))
	};
}

/** Returns the projected income for the creator in dollars
 *
 * @param transactionCost cost in cents or dollars depending on `unit`
 * @param unit unit of the provided cost
 * @returns
 */
export function calculateCreatorIncome(
	transactionCost: number,
	unit: 'cents' | 'dollars' = 'cents'
) {
	if (unit === 'cents') {
		return (transactionCost - calculatePlatformFee(transactionCost)).toFixed(2);
	} else {
		const cost = transactionCost * 100;

		return ((cost - calculatePlatformFee(cost)) / 100).toFixed(2);
	}
}
