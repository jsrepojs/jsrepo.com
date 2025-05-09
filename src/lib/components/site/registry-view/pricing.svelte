<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import { calculateDiscountedPrice } from '$lib/ts/stripe/connect';
	import { Check } from '@lucide/svelte';
	import type { RegistryViewPageData } from './types';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/state';
	import { UseQuery } from '$lib/hooks/use-query.svelte';
	import type { PurchaseRegistryRequest } from '../../../../routes/api/stripe/connect/registries/purchase/+server';
	import * as Select from '$lib/components/ui/select';
	import { cn } from '$lib/utils/utils';

let { data }: { data: RegistryViewPageData } = $props();

	let selectedPricing = $state<'individual' | 'org'>('individual');
	let selectedOrg = $state(data.userOrgs[0]?.org.id);

	const purchaseRegistryQuery = new UseQuery(
		async ({ setLoadingKey }, priceId: number, referenceId: string) => {
			setLoadingKey(`${priceId}`);

			const response = await fetch('/api/stripe/connect/registries/purchase', {
				method: 'POST',
				body: JSON.stringify({
					priceId,
					registryId: data.registry.id,
					referenceId
				} satisfies PurchaseRegistryRequest)
			});

			if (!response.ok) {
				console.error(response);
			}

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
				{@const discountedPrice = calculateDiscountedPrice(price)}
				<div class="flex aspect-square w-64 flex-col justify-between gap-2 rounded-lg bg-card p-4">
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
					{#if data.session !== null}
						{#if data.licenses.find((l) => l.referenceId === data.session?.user.id && l.registryId === data.registry.id)}
							<Button disabled variant="outline">
								<Check class="size-4 text-green-400" />
								Owned
							</Button>
						{:else}
							<Button
								loading={purchaseRegistryQuery.loadingKey === price.id.toString()}
								onclick={() => purchaseRegistryQuery.run(price.id, data.session?.user.id as string)}
							>
								Buy
							</Button>
						{/if}
					{:else}
						<Button href="/login?redirect_to={page.url.pathname}{page.url.search}">
							Login to Buy
						</Button>
					{/if}
				</div>
			{/each}
		{:else if selectedPricing === 'org'}
			{@const orgPrices = data.prices
				.filter((p) => p.target === 'org')
				.sort((a, b) => a.cost - b.cost)}
			{#each orgPrices as price (price.id)}
				{@const discountedPrice = calculateDiscountedPrice(price)}
				<div class="flex aspect-square w-64 flex-col justify-between gap-2 rounded-lg bg-card p-4">
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
					<div class="flex w-full flex-col gap-2">
						<Select.Root type="single" bind:value={selectedOrg}>
							<Select.Trigger>
								<span>
									{data.userOrgs.find(({ org }) => org.id === selectedOrg)?.org.name ?? '--'}
								</span>
							</Select.Trigger>
							<Select.Content>
								{#each data.userOrgs as { org } (org.id)}
									<Select.Item value={org.id}>
										{org.name}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						{#if data.session !== null}
							{#if data.licenses.find((l) => l.referenceId === selectedOrg && l.registryId === data.registry.id)}
								<Button disabled variant="outline">
									<Check class="size-4 text-green-400" />
									Owned
								</Button>
							{:else}
								<Button
									loading={purchaseRegistryQuery.loadingKey === price.id.toString()}
									disabled={selectedOrg === ''}
									onclick={() => purchaseRegistryQuery.run(price.id, selectedOrg)}
								>
									Buy
								</Button>
							{/if}
						{:else}
							<Button href="/login?redirect_to={page.url.pathname}{page.url.search}">
								Login to Buy
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
