const ABORT_REASON = '[use-query] aborted';

export type Options = {
	debounceMs?: number;
	/** Sets `.data` to undefined before every call */
	invalidateOnCall?: boolean;
};

export type QueryFnOptions = {
	signal: AbortController['signal'];
	wasAborted: (err: unknown) => boolean;
	setLoadingKey: (key: string) => void;
};

export type QueryFn<T, Args extends unknown[]> = (
	opts: QueryFnOptions,
	...args: Args
) => Promise<T>;

export class UseQuery<T, Args extends unknown[] = []> {
	private debounceTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
	private abortController: AbortController | undefined = undefined;
	private debounceMs: number;
	private invalidateOnCall: boolean;
	#data = $state<T>();
	#loading = $state(false);
	#loadingKey = $state<string>();
	#error = $state<unknown | null>(null);
	fn: QueryFn<T, Args>;

	constructor(fn: QueryFn<T, Args>, { debounceMs = 250, invalidateOnCall = false }: Options = {}) {
		this.fn = fn;

		// options
		this.debounceMs = debounceMs;
		this.invalidateOnCall = invalidateOnCall;

		// function bindings
		this.runDB = this.runDB.bind(this);
		this.run = this.run.bind(this);
	}

	static wasAborted(err: unknown) {
		return err === ABORT_REASON;
	}

	async run(...args: Args) {
		this.#error = undefined;
		if (this.invalidateOnCall) {
			this.#data = undefined;
		}

		// abort previous request
		this.abortController?.abort(ABORT_REASON);
		this.abortController = new AbortController();
		this.#loading = true;

		try {
			this.#data = await this.fn(
				{
					signal: this.abortController.signal,
					wasAborted: UseQuery.wasAborted,
					setLoadingKey: (key) => (this.#loadingKey = key)
				},
				...args
			);
		} catch (err) {
			// don't count aborted as an error
			if (!UseQuery.wasAborted(err)) {
				this.#error = err;
				this.#data = undefined;
			}
			this.#data = undefined;
		} finally {
			this.#loading = false;
			this.#loadingKey = undefined;
		}
	}

	/** A debounced version of `.run()` */
	async runDB(...args: Args) {
		if (this.invalidateOnCall) {
			this.#data = undefined;
		}

		this.abortController?.abort(ABORT_REASON);
		clearTimeout(this.debounceTimeout);

		this.debounceTimeout = setTimeout(() => this.run(...args), this.debounceMs);
	}

	get data() {
		return this.#data;
	}

	set data(v) {
		this.#data = v;
	}

	get loading() {
		return this.#loading;
	}

	get loadingKey() {
		return this.#loadingKey;
	}

	get error() {
		return this.#error;
	}
}
