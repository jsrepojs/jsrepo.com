export function getInitials(name: string | undefined) {
	if (!name) return '?';

	const [first, last] = name.split(' ');

	return `${first?.[0]}${last?.[0] ?? ''}`.toUpperCase();
}
