<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import { calculateDiscountedPrice } from '$lib/ts/stripe/connect';
	import { Check } from '@lucide/svelte';
	import type { RegistryViewPageData } from './types';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/state';
	import { UseQuery } from '$lib/hooks/use-query.svelte';
	import type { PurchaseRegistryRequest } from '../../../../routes/api/stripe/connect/registries/purchase/+server';
	import { cn } from '$lib/utils/utils';
	import type { RegistryPrice } from '$lib/backend/db/schema';

	let { data }: { data: RegistryViewPageData } = $props();

	let selectedPricing = $state<'individual' | 'org'>('individual');
	let selectedOrg = $state(data.userOrgs[0]?.org.id);

	const purchaseRegistryQuery = new UseQuery(
		async ({ setLoadingKey }, priceId: number, referenceId: string) => {
			setLoadingKey(`${priceId}`);

			const response = await fetch('/api/stripe/connect/registries/purchase', {
				method: 'POST',
				headers: { 'content-type': 'applications/json' },
				body: JSON.stringify({
					priceId,
					registryId: data.registry.id,
					referenceId
				} satisfies PurchaseRegistryRequest)
			});

			const res = await response.json();

			const { url } = res;

			if (url) {
				window.location.href = url;
			}
		}
	);
</script>

<div class="flex flex-col py-2">
	<Tabs.Root bind:value={selectedPricing}>
		<Tabs.List class="p-0">
			<Tabs.Trigger value="individual" class="px-4" aria-label="Individual Pricing">
				Individual
			</Tabs.Trigger>
			<Tabs.Trigger value="org" class="px-4" aria-label="Organization Pricing">
				Organization
			</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>
	<div class="flex flex-wrap gap-2 py-2">
		{#if selectedPricing === 'individual'}
			{@const individualPrices = data.prices
				.filter((p) => p.target === 'individual')
				.sort((a, b) => a.cost - b.cost)}
			{#each individualPrices as price (price.id)}
				{@render card({ referenceId: data.session?.user.id ?? '', price })}
			{/each}
		{:else if selectedPricing === 'org'}
			{@const orgPrices = data.prices
				.filter((p) => p.target === 'org')
				.sort((a, b) => a.cost - b.cost)}
			{#each orgPrices as price (price.id)}
				{@render card({ referenceId: selectedOrg, price })}
			{/each}
		{/if}
	</div>
</div>

{#snippet card({ price, referenceId }: { referenceId: string; price: RegistryPrice })}
	{@const discountedPrice = calculateDiscountedPrice(price)}
	<div class="flex w-72 flex-col justify-between gap-10 rounded-lg bg-card p-6">
		<div class="flex flex-col gap-2">
			<div class="flex flex-col gap-2">
				<span class="text-lg font-bold">Individual License</span>
				<div class="flex flex-col gap-2">
					<div class="flex place-items-start gap-1">
						<span class="text-5xl">
							${discountedPrice.price / 100}
						</span>
						{#if discountedPrice.discount !== null}
							<span
								class={cn('text-xl', {
									'text-muted-foreground line-through': discountedPrice.discount !== null
								})}
							>
								${price.cost / 100}
							</span>
						{/if}
					</div>
					<div class="flex place-items-center gap-2">
						<div class="rounded-md bg-background px-1 py-0.5 text-sm">one time</div>
						{#if discountedPrice.discount}
							<div class="rounded-md border-green-400 bg-green-400/20 px-1 py-0.5 text-sm">
								{discountedPrice.discount}% off
							</div>
						{/if}
					</div>
				</div>
			</div>
			<div>
				{@render feature_list({ features: ['Lifetime Access', 'Unlimited Downloads'] })}
			</div>
		</div>
		{#if data.session !== null}
			{#if data.licenses.find((l) => l.referenceId === referenceId && l.registryId === data.registry.id)}
				<Button disabled variant="outline">
					<Check class="size-4 text-green-400" />
					Owned
				</Button>
			{:else}
				<Button
					loading={purchaseRegistryQuery.loadingKey === price.id.toString()}
					onclick={() => purchaseRegistryQuery.run(price.id, referenceId)}
				>
					Buy
				</Button>
			{/if}
		{:else}
			<Button href="/login?redirect_to={page.url.pathname}{page.url.search}">Login to Buy</Button>
		{/if}
	</div>
{/snippet}

{#snippet feature_list({ features }: { features: string[] })}
	<ul class="mb-auto flex flex-col gap-2 text-sm text-muted-foreground">
		{#each features as feature (feature)}
			<li class="flex place-items-start gap-2 text-sm/[--line-height]" style="--line-height: 20px;">
				<span class="flex h-[var(--line-height)] place-items-center justify-center">
					<Check class="size-4 text-green-400" />
				</span>
				{feature}
			</li>
		{/each}
	</ul>
{/snippet}
