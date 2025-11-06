import { DateTime } from 'luxon';

export function toRelative(date: Date) {
	return DateTime.fromJSDate(date).toRelative();
}
w;
