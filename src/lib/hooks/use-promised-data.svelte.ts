export class UsePromisedData<T> {
	private promise: Promise<T>;
	private resolvedValue = $state<T>();
	constructor(promise: Promise<T>) {
		this.promise = $state(promise);
		this.promise.then((value) => {
			this.resolvedValue = value;
		});
	}

	get value(): Promise<T> {
		if (this.resolvedValue) return Promise.resolve(this.resolvedValue);
		return this.promise;
	}

	setValue(value: T) {
		this.resolvedValue = value;
	}
}
