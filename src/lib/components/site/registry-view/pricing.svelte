<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		calculateCreatorIncome,
		calculateDiscountedPrice,
		MAX_PRICE,
		MIN_PRICE
	} from '$lib/ts/stripe/connect';
	import { Check } from '@lucide/svelte';
	import type { RegistryViewPageData } from './types';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/state';
	import { UseQuery } from '$lib/hooks/use-query.svelte';
	import type { PurchaseRegistryRequest } from '../../../../routes/api/stripe/connect/registries/purchase/+server';
	import { cn } from '$lib/utils/utils';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import type { CreateRegistryPricesRequest } from '../../../../routes/api/scopes/[scope=scope]/[name]/marketplace/prices/+server';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: RegistryViewPageData } = $props();

	// pricing setup
	let individualPrice = $state<number | null>(null);
	let orgPrice = $state<number | null>(null);

	const individualPriceValid = $derived(
		individualPrice !== null && individualPrice >= MIN_PRICE && individualPrice < MAX_PRICE
	);
	const orgPriceValid = $derived(
		orgPrice !== null && orgPrice >= MIN_PRICE && orgPrice < MAX_PRICE
	);

	const canSubmitPricing = $derived(orgPriceValid && individualPriceValid);

	let selectedPricing = $state<'individual' | 'org'>('individual');
	let selectedOrg = $state(data.userOrgs[0]?.org.id);

	const setupPricingQuery = new UseQuery(async () => {
		if (individualPrice === null || orgPrice === null) return;

		const response = await fetch(
			`/api/scopes/@${data.scopeName}/${data.registryName}/marketplace/prices`,
			{
				method: 'POST',
				headers: { 'content-type': 'applications/json' },
				body: JSON.stringify({
					individualPrice,
					orgPrice
				} satisfies CreateRegistryPricesRequest)
			}
		);

		if (response.ok) {
			await invalidateAll();
		}
	});

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

{#if data.registry.access === 'marketplace' && (data.hasAccess || data.registry.listOnMarketplace)}
	<div class="flex flex-col py-2">
		{#if data.prices.length === 0 && data.hasAccess}
			<div class="flex w-full flex-col place-items-center gap-10 py-10">
				<h1 class="text-3xl font-bold">Pricing Setup</h1>
				<div class="grid w-full grid-cols-1 place-items-center gap-4 md:grid-cols-2">
					<div
						data-estimate-visible={individualPrice !== null}
						class="w-full max-w-72 rounded-lg bg-card/50 transition-all data-[estimate-visible=false]:mb-9 md:place-self-end"
					>
						<div
							class="flex w-full max-w-72 flex-col gap-10 rounded-lg border border-dashed bg-card p-6"
						>
							<div class="flex flex-col gap-2">
								<div class="flex flex-col gap-2">
									<span class="text-lg font-bold">Individual License</span>
									<div class="flex flex-col gap-2">
										<div class="flex place-items-start gap-1">
											<span class="text-5xl"> $ </span>
											<Input
												class="h-12 rounded-none border-x-0 border-b border-t-0 border-b-border bg-transparent px-0 !text-5xl !ring-0 focus-visible:border-b-primary aria-[invalid=true]:border-b-destructive aria-[invalid=true]:text-destructive"
												placeholder="10"
												type="number"
												min={MIN_PRICE}
												max={MAX_PRICE}
												aria-invalid={individualPrice !== null && !individualPriceValid}
												bind:value={individualPrice}
											/>
										</div>
										<div class="flex place-items-center gap-2">
											<div class="rounded-md bg-background px-1 py-0.5 text-sm">one time</div>
										</div>
									</div>
								</div>
								<div>
									{@render feature_list({
										features: ['Lifetime Access', 'Unlimited Downloads', '']
									})}
								</div>
							</div>
							<Button disabled>Buy</Button>
						</div>
						<div
							data-visible={individualPrice !== null}
							class="group flex h-0 place-items-center px-6 text-opacity-0 transition-all data-[visible=true]:h-9"
						>
							<span
								class="text-sm text-muted-foreground opacity-0 group-data-[visible=true]:opacity-100 group-data-[visible=true]:transition-all group-data-[visible=true]:delay-150"
							>
								<span class="text-green-500">
									${calculateCreatorIncome(individualPrice ?? 0, 'dollars')}</span
								> will be paid to you.
							</span>
						</div>
					</div>
					<div
						data-estimate-visible={orgPrice !== null}
						class="w-full max-w-72 rounded-lg bg-card/50 transition-all data-[estimate-visible=false]:mb-9 md:place-self-start"
					>
						<div
							class="flex w-full max-w-72 flex-col gap-10 rounded-lg border border-dashed bg-card p-6"
						>
							<div class="flex flex-col gap-2">
								<div class="flex flex-col gap-2">
									<span class="text-lg font-bold">Organization License</span>
									<div class="flex flex-col gap-2">
										<div class="flex place-items-start gap-1">
											<span class="text-5xl"> $ </span>
											<Input
												class="h-12 rounded-none border-x-0 border-b border-t-0 border-b-border bg-transparent px-0 !text-5xl !ring-0 focus-visible:border-b-primary aria-[invalid=true]:border-b-destructive aria-[invalid=true]:text-destructive"
												placeholder="30"
												type="number"
												min={MIN_PRICE}
												max={MAX_PRICE}
												aria-invalid={orgPrice !== null && !orgPriceValid}
												bind:value={orgPrice}
											/>
										</div>
										<div class="flex place-items-center gap-2">
											<div class="rounded-md bg-background px-1 py-0.5 text-sm">one time</div>
										</div>
									</div>
								</div>
								<div>
									{@render feature_list({
										features: [
											'Lifetime Access',
											'Unlimited Downloads',
											'Access for your Organization'
										]
									})}
								</div>
							</div>
							<Button disabled>Buy</Button>
						</div>
						<div
							data-visible={orgPrice !== null}
							class="group flex h-0 place-items-center px-6 text-opacity-0 transition-all data-[visible=true]:h-9"
						>
							<span
								class="text-sm text-muted-foreground opacity-0 group-data-[visible=true]:opacity-100 group-data-[visible=true]:transition-all group-data-[visible=true]:delay-150"
							>
								<span class="text-green-500"
									>${calculateCreatorIncome(orgPrice ?? 0, 'dollars')}</span
								> will be paid to you.
							</span>
						</div>
					</div>
				</div>
				<Button
					disabled={!canSubmitPricing}
					onclick={setupPricingQuery.run}
					loading={setupPricingQuery.loading}
				>
					Continue
				</Button>
			</div>
		{:else}
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
						{@const referenceId = data.session?.user.id ?? ''}
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
												<div
													class="rounded-md border-green-400 bg-green-400/20 px-1 py-0.5 text-sm"
												>
													{discountedPrice.discount}% off
												</div>
											{/if}
										</div>
									</div>
								</div>
								<div>
									{@render feature_list({
										features: ['Lifetime Access', 'Unlimited Downloads', '']
									})}
								</div>
								<div class="h-9"></div>
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
						{@const referenceId = selectedOrg}
						{@const discountedPrice = calculateDiscountedPrice(price)}
						<div class="flex w-72 flex-col justify-between gap-10 rounded-lg bg-card p-6">
							<div class="flex flex-col gap-2">
								<div class="flex flex-col gap-2">
									<span class="text-lg font-bold">Organization License</span>
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
												<div
													class="rounded-md border-green-400 bg-green-400/20 px-1 py-0.5 text-sm"
												>
													{discountedPrice.discount}% off
												</div>
											{/if}
										</div>
									</div>
								</div>
								<div>
									{@render feature_list({
										features: [
											'Lifetime Access',
											'Unlimited Downloads',
											'Access for your Organization'
										]
									})}
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
									{#if data.licenses.find((l) => l.referenceId === referenceId && l.registryId === data.registry.id)}
										<Button disabled variant="outline">
											<Check class="size-4 text-green-400" />
											Owned
										</Button>
									{:else}
										<Button
											loading={purchaseRegistryQuery.loadingKey === price.id.toString()}
											disabled={selectedOrg === ''}
											onclick={() => purchaseRegistryQuery.run(price.id, referenceId)}
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
		{/if}
	</div>
{/if}

{#snippet feature_list({ features }: { features: string[] })}
	<ul class="mb-auto flex flex-col gap-2 text-sm text-muted-foreground">
		{#each features as feature (feature)}
			<li class="flex place-items-start gap-2 text-sm/[--line-height]" style="--line-height: 20px;">
				<span
					data-visible={feature.length > 0}
					class="flex h-[var(--line-height)] place-items-center justify-center opacity-0 data-[visible=true]:opacity-100"
				>
					<Check class="size-4 text-green-400" />
				</span>
				{feature}
			</li>
		{/each}
	</ul>
{/snippet}
