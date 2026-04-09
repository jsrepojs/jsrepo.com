<script lang="ts">
	import type { RegistryRatings } from '$lib/backend/db/functions';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { cn } from '$lib/utils';
	import ReviewStars from './review-stars.svelte';

	type Props = {
		ratings: Promise<RegistryRatings>;
		class?: string;
	};

	let { ratings: ratingsPromise, class: className }: Props = $props();
</script>

{#await ratingsPromise}
	<div class={cn('bg-card flex h-fit w-full flex-col rounded-lg p-4', className)}>
		<div class="flex place-items-center gap-2 py-2">
			<span class="text-5xl">
				<Skeleton class="h-12 w-16" />
			</span>
			<div class="flex flex-col gap-1">
				<Skeleton class="h-5 w-36" />
				<Skeleton class="h-[14px] w-12" />
			</div>
		</div>
		<div class="flex flex-col gap-1">
			{#each { length: 5 } as _, i (i)}
				<Skeleton class="h-[14px] w-full" />
			{/each}
		</div>
	</div>
{:then ratings}
	<div class={cn('bg-card flex h-fit w-full flex-col rounded-lg p-4', className)}>
		<div class="flex place-items-center gap-2 py-2">
			<span class="text-5xl">
				{Number.isNaN(ratings.overall) ? '0.0' : ratings.overall.toFixed(1)}
			</span>
			<div class="flex flex-col">
				<ReviewStars rating={ratings.overall} />
				<span class="text-muted-foreground text-sm">
					{ratings.totalRatings} Rating{ratings.totalRatings === 1 ? '' : 's'}
				</span>
			</div>
		</div>
		<div class="flex flex-col">
			{#each { length: 5 } as _, i (i)}
				{@const rating = 5 - i}
				{@const reviews = ratings.ratings[rating - 1]}
				{@const percentOfReviews = (reviews / ratings.totalRatings) * 100}
				<div class="flex place-items-center">
					<span class="text-muted-foreground w-4 text-sm"> {rating} </span>
					<div class="bg-background relative h-2 w-full overflow-hidden rounded-2xl">
						<div
							class="bg-primary h-2"
							style="width: {reviews === 0 ? 0 : percentOfReviews}%;"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/await}
