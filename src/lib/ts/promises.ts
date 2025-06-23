/*
	Installed from github/ieedan/std
*/

import { StopWatch } from './stopwatch';
import { formatDuration } from './time';

/** Returns a promise that immediately resolves to `T`, useful when you need to mix sync and async code.
 *
 * @param val
 *
 * ### Usage
 * ```ts
 * const promises: Promise<number>[] = [];
 *
 * promises.push(immediate(10));
 * ```
 */
export function immediate<T>(val: T): Promise<T> {
	return new Promise<T>((res) => res(val));
}

export async function timed<T extends unknown | void>(
	promise: T,
	key: string
): Promise<Awaited<T>> {
	const s = new StopWatch();
	s.start();

	const res = await promise;

	s.stop();

	console.log(`${key} took ${formatDuration(s.elapsed())}`);

	return res;
}

export async function allTimed<T extends readonly unknown[] | []>(
	promises: T,
	key: string
): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }> {
	return (await Promise.all(promises.map((p, i) => timed(p, `[${key}] [${i}]`)))) as {
		-readonly [P in keyof T]: Awaited<T[P]>;
	};
}
