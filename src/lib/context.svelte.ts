import { Context } from 'runed';

export const NO_SEARCH_BAR_ROUTES = ['/', '/login', '/pricing']

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
