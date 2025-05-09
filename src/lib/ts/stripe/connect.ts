import type { RegistryPrice } from '$lib/backend/db/schema';

/** 10% + 30¢ (negotiable)
 *
 * @param transactionCost cost in cents
 * @returns
 */
export function calculatePlatformFee(transactionCost: number) {
	return transactionCost * 0.1 + 30;
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

	return { discount: price.discount, price: price.cost - price.cost * (price.discount / 100) };
}
