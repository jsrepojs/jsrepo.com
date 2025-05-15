import { page } from '$app/state';
import { Context } from 'runed';

export function shouldShowSearch() {
	if (NO_SEARCH_BAR_ROUTES.includes(page.url.pathname)) return false;

	if (page.error !== null) return false;

	return true;
}

export const NO_SEARCH_BAR_ROUTES = ['/', '/login', '/pricing', '/help', '/marketplace'];

export class UseReactive<T> {
	#current = $state<T>();

	constructor(str: T) {
		this.#current = str;
	}

	set current(val) {
		this.#current = val;
	}

	get current() {
		return this.#current;
	}
}

export const newTokenContext = new Context<UseReactive<{ id: string; key: string } | null>>(
	'new-token'
);
