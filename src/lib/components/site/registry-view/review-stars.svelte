<script lang="ts">
	import { cn } from '$lib/utils';
	import ReviewStar from './review-star.svelte';

	type Props = {
		rating: number;
		stars?: number;
		class?: string;
		fill?: 'background' | 'border';
	};

	let { rating, stars = 5, class: className, fill = 'background' }: Props = $props();

	const filled = $derived(Number.isNaN(rating) ? 0 : Math.floor(rating));

	function getFill(star: number) {
		if (Number.isNaN(rating)) return 0;

		if (filled >= star) return 100;

		if (filled < star - 1) return 0;

		return (rating - filled) * 100;
	}
</script>

<div class="flex place-items-center gap-0.5">
	{#each { length: stars } as _, i (i)}
		{@const percent = getFill(i + 1)}
		<ReviewStar class={cn('size-5', className)} {percent} {fill} />
	{/each}
</div>
