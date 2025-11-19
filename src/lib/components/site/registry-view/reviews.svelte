<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Bug, MessageSquareMore } from '@lucide/svelte';
	import { reviewSchema, type RegistryViewPageData } from './types';
	import { page } from '$app/state';
	import { Modal } from '$lib/components/ui/modal';
	import { StarRating } from '$lib/components/ui/star-rating';
	import { superForm } from 'sveltekit-superforms/client';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import * as Form from '$lib/components/ui/form';
	import { Textarea } from '$lib/components/ui/textarea';
	import { invalidateAll } from '$app/navigation';
	import { toRelative } from '$lib/ts/dates';
	import ReviewsCard from './reviews-card.svelte';
	import { UseQuery } from '$lib/hooks/use-query.svelte';
	import * as List from '$lib/components/site/list';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { getCanLeaveReviews, getReviews, getRegistryRatings } from './reviews.remote.js';

	let { data }: { data: RegistryViewPageData } = $props();

	const form = superForm(data.reviewForm, {
		validators: valibotClient(reviewSchema),
		onResult: async ({ result }) => {
			if (result.type === 'success') {
				await invalidateAll();
				reviewOpen = false;
			}
		}
	});

	const { form: formData, enhance, submitting } = form;

	$effect(() => {
		if ($formData.rating === 0) {
			$formData.rating = 1;
		}
	});

	let reviewOpen = $state(false);

	const reviewsQuery = getReviews({
		scope: page.params.scope ?? '',
		registry: page.params.name ?? ''
	});
    
    let reviews = $derived(reviewsQuery.current);

	const loadMoreQuery = new UseQuery(async () => {
        if (!reviews) return;
        
		const response = await fetch(
			`/api/scopes/${page.params.scope}/${page.params.name}/reviews?limit=${5}&offset=${reviews.length}`
		);

		if (response.ok) {
			const res = (await response.json()) as Awaited<typeof reviews>;

			for (let i = 0; i < res.length; i++) {
				res[i].createdAt = new Date(res[i].createdAt);
			}

			reviews = [...reviews, ...res];
		}
	});
</script>

<div class="grid gap-2 py-4 lg:grid-cols-[1fr_20rem]">
	<div class="flex flex-col gap-2">
		<div class="flex flex-wrap place-items-start justify-between gap-2">
			<div>
				<h1 class="text-4xl font-semibold">Ratings & Reviews</h1>
			</div>
			<div class="flex flex-wrap place-items-center gap-2 md:justify-end">
				{#if data.session}
					{#if await getCanLeaveReviews( { scope: page.params.scope ?? '', registry: page.params.name ?? '' } )}
						<Button variant="outline" onclick={() => (reviewOpen = true)}>
							<MessageSquareMore />
							Leave a Review
						</Button>
					{/if}
				{:else}
					<Button variant="outline" href="/login?redirect_to={page.url.pathname}{page.url.search}">
						<MessageSquareMore />
						Leave a Review
					</Button>
				{/if}
				{#if data.registry.metaBugs}
					<Button variant="outline" href={data.registry.metaBugs} target="_blank">
						<Bug />
						Report a Bug
					</Button>
				{/if}
			</div>
		</div>
		<ReviewsCard
			class="lg:hidden"
			ratings={getRegistryRatings({
				scope: page.params.scope ?? '',
				registry: page.params.name ?? ''
			})}
		/>
		<div class="flex flex-col gap-2">
			{#if reviewsQuery.loading}
				<Skeleton class="h-[88px] w-full"></Skeleton>
			{:else if reviews}
				{@const moreExist = reviews.length % 5 === 0}
				{#if reviews.length > 0}
					{#each reviews as review (review.id)}
						<div class="flex flex-col gap-2 py-4">
							<div class="flex place-items-center gap-2">
								<a
									href="/users/{review.user.username}"
									class="font-medium text-nowrap underline-offset-2 hover:underline"
								>
									{review.user.username}
								</a>
								<span class="text-muted-foreground hidden sm:inline">
									{toRelative(review.createdAt)}
								</span>
								<StarRating readonly value={review.rating} />
							</div>
							<p>
								{review.comment}
							</p>
						</div>
					{/each}
					{#if moreExist}
						<div>
							<Button variant="outline" loading={loadMoreQuery.loading} onclick={loadMoreQuery.run}>
								Load More
							</Button>
						</div>
					{/if}
				{:else}
					<List.Empty>There aren't any reviews yet.</List.Empty>
				{/if}
			{/if}
		</div>
	</div>
	<ReviewsCard
		class="hidden max-w-80 lg:flex"
		ratings={getRegistryRatings({
			scope: page.params.scope ?? '',
			registry: page.params.name ?? ''
		})}
	/>
</div>

<Modal bind:open={reviewOpen} class="p-0">
	<form method="post" action="?/review" use:enhance class="w-full space-y-2 p-6">
		<div>
			<h1 class="text-2xl font-bold">Leave a Review</h1>
			<Form.Field {form} name="comment">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label class="font-medium">Comment</Form.Label>
						<Textarea
							{...props}
							name="comment"
							id="comment"
							placeholder="Tell us about your experience..."
							bind:value={$formData.comment}
						/>
					{/snippet}
				</Form.Control>
			</Form.Field>
		</div>
		<div>
			<Form.Field {form} name="rating">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label class="font-medium">Overall Experience</Form.Label>
						<StarRating bind:value={$formData.rating} {...props} />
					{/snippet}
				</Form.Control>
			</Form.Field>
		</div>
		<div class="flex place-items-center justify-end">
			<Form.Button
				type="submit"
				loading={$submitting}
				disabled={$formData.comment.length === 0 || $formData.rating === undefined}
			>
				Submit
			</Form.Button>
		</div>
	</form>
</Modal>
