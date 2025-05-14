<script lang="ts">
	import * as array from '$lib/ts/array';
	import { cn } from '$lib/utils/utils';
	import ReviewStars from './review-stars.svelte';

	type Review = {
		rating: number;
	};

	type Props = {
		reviews: Review[];
		class?: string;
	};

	let { reviews: allReviews, class: className }: Props = $props();

	const overall = $derived(array.average(allReviews, (r) => r.rating));
</script>

<div class={cn('flex h-fit w-full flex-col rounded-lg bg-card p-4', className)}>
	<div class="flex place-items-center gap-2 py-2">
		<span class="text-5xl">
			{overall.toFixed(1)}
		</span>
		<div class="flex flex-col">
			<ReviewStars rating={overall} />
			<span class="text-sm text-muted-foreground">
				{allReviews.length} Rating{allReviews.length === 1 ? '' : 's'}
			</span>
		</div>
	</div>
	<div class="flex flex-col">
		{#each { length: 5 } as _, i (i)}
			{@const rating = 5 - i}
			{@const reviews = allReviews.filter((r) => r.rating === rating)}
			{@const percentOfReviews = (reviews.length / allReviews.length) * 100}
			<div class="flex place-items-center">
				<span class="w-4 text-sm text-muted-foreground"> {rating} </span>
				<div class="relative h-2 w-full overflow-hidden rounded-2xl bg-background">
					<div class="h-2 bg-primary" style="width: {percentOfReviews}%;"></div>
				</div>
			</div>
		{/each}
	</div>
</div>
