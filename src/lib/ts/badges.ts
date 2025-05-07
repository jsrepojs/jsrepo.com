import { makeBadge } from 'badge-maker';

export function errorBadge(label: string, code: number) {
	const badge = makeBadge({
		label,
		labelColor: '#f7df1e',
		color: '#ff0000',
		message: code.toString()
	});

	return new Response(badge, {
		headers: {
			'Content-Type': 'image/svg+xml'
		}
	});
}
