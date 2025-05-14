<script lang="ts">
	import ReviewStar from './review-star.svelte';

	type Props = {
		rating: number;
		stars?: number;
	};

	let { rating, stars = 5 }: Props = $props();

	const filled = $derived(Math.floor(rating));

	function getFill(star: number) {
		if (filled >= star) return 100;

		if (filled < star - 1) return 0;

		return (rating - filled) * 100;
	}
</script>

<div class="flex place-items-center gap-1">
	{#each { length: stars } as _, i (i)}
		{@const percent = getFill(i + 1)}
		<ReviewStar class="size-5" {percent} />
	{/each}
</div>
