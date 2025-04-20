import { Context } from 'runed';

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
