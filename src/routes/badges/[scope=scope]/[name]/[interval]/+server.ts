import { getPublicDownloads } from '$lib/backend/db/functions.js';
import { DAY, YEAR } from '$lib/ts/time';
import { error } from '@sveltejs/kit';
import { makeBadge } from 'badge-maker';

const INTERVALS: Record<string, { from: Date; label: string }> = {
	dw: {
		from: new Date(Date.now() - DAY * 7),
		label: 'week'
	},
	dm: {
		from: new Date(Date.now() - DAY * 30),
		label: 'month'
	},
	dy: {
		from: new Date(Date.now() - YEAR),
		label: 'year'
	}
};

export async function GET({ params }) {
	const { name, interval } = params;

	const scope = params.scope.slice(1);

	const { from, label } = INTERVALS[interval];

	if (from === undefined) {
		error(
			400,
			`Invalid interval ${interval}. Allowed intervals are ${Object.entries(INTERVALS)
				.map(([i]) => i)
				.join(', ')}`
		);
	}

	const downloads = await getPublicDownloads({ scope, registryName: name, from });

	const badge = makeBadge({
		label: 'downloads',
		labelColor: '#f7df1e',
		color: '#1C1918',
		message: `${displayNumber(downloads)}/${label}`
	});

	return new Response(badge, {
		headers: {
			'Content-Type': 'image/svg+xml'
		}
	});
}

function displayNumber(number: number) {
	if (number < 1000) {
		return number.toString();
	}

	if (number >= 1000 && number < 1_000_000) {
		return `${(number / 1000).toFixed(1)}k`;
	}

	return `${(number / 1_000_000).toFixed(1)}m`;
}
