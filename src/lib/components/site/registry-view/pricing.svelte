<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		calculateCreatorIncome,
		calculateDiscountedPrice,
		MAX_PRICE,
		MIN_PRICE
	} from '$lib/ts/stripe/connect';
	import { Check, Pencil } from '@lucide/svelte';
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
	import { Modal } from '$lib/components/ui/modal';
	import type { RegistryPrice } from '$lib/backend/db/schema';
	import { Separator } from '$lib/components/ui/separator';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { CalendarInput } from '$lib/components/ui/calendar';
	import { type DateValue, getLocalTimeZone, today, fromDate } from '@internationalized/date';
	import { DAY } from '$lib/ts/time';
	import type { UpdateRegistryPriceRequest } from '../../../../routes/api/scopes/[scope=scope]/[name]/marketplace/prices/[id]/+server';

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

	// edit price
	let showEditPrice = $state(false);
	let editingPrice = $state<RegistryPrice>();
	let originalPrice = $state<RegistryPrice>();
	let editingPriceCost = $derived<number | null>((originalPrice?.cost ?? 0) / 100);
	const editingPriceCostValid = $derived(
		editingPriceCost !== null && editingPriceCost >= MIN_PRICE && editingPriceCost < MAX_PRICE
	);

	let enableDiscount = $derived(originalPrice?.discount !== null);
	let enableDiscountExpiration = $derived(originalPrice?.discountUntil !== null);
	let discountUntil = $derived<DateValue>(
		originalPrice?.discountUntil
			? fromDate(originalPrice.discountUntil, getLocalTimeZone())
			: today(getLocalTimeZone())
	);

	const discountValid = $derived(
		enableDiscount
			? editingPrice !== undefined &&
					editingPrice.discount !== null &&
					editingPrice.discount > 0 &&
					editingPrice.discount < 100
			: true
	);

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

	const canUpdatePrice = $derived(editingPriceCostValid && discountValid);

	const updatePriceQuery = new UseQuery(async () => {
		if (!originalPrice || !editingPrice || !canUpdatePrice) return;

		const response = await fetch(
			`/api/scopes/@${data.scopeName}/${data.registryName}/marketplace/prices/${originalPrice.id}`,
			{
				method: 'PATCH',
				headers: { 'content-type': 'applications/json' },
				body: JSON.stringify({
					cost: editingPriceCost!,
					discount: enableDiscount ? editingPrice.discount : null,
					discountUntil:
						enableDiscount && enableDiscountExpiration
							? discountUntil.toDate(getLocalTimeZone()).toISOString()
							: null
				} satisfies UpdateRegistryPriceRequest)
			}
		);

		if (response.ok) {
			await invalidateAll();
			showEditPrice = false;
		} else {
			const message = (await response.json()).message;

			throw new Error(message);
		}
	});

	function startEditPrice(price: RegistryPrice) {
		editingPrice = price;
		originalPrice = structuredClone(price);

		showEditPrice = true;
	}
</script>

{#if data.registry.access === 'marketplace' && (data.hasSettingsAccess || data.registry.listOnMarketplace)}
	<div class="flex flex-col py-2">
		{#if data.prices.length === 0 && data.hasSettingsAccess}
			<div class="flex w-full flex-col place-items-center gap-10 py-10">
				<h1 class="text-3xl font-bold">Pricing Setup</h1>
				<div class="grid w-full grid-cols-1 place-items-center gap-4 md:grid-cols-2">
					<div
						data-estimate-visible={individualPrice !== null}
						class="bg-card/50 w-full max-w-80 rounded-lg transition-all data-[estimate-visible=false]:mb-9 md:place-self-end"
					>
						<div
							class="bg-card flex w-full max-w-80 flex-col gap-10 rounded-lg border border-dashed p-6"
						>
							<div class="flex flex-col gap-2">
								<div class="flex flex-col gap-2">
									<span class="text-lg font-bold">Individual License</span>
									<div class="flex flex-col gap-2">
										<div class="flex place-items-start gap-1">
											<span class="text-5xl"> $ </span>
											<Input
												class="border-b-border focus-visible:border-b-primary aria-invalid:border-b-destructive aria-invalid:text-destructive h-12 rounded-none border-x-0 border-t-0 border-b bg-transparent px-0 text-5xl! ring-0!"
												placeholder="10"
												type="number"
												min={MIN_PRICE}
												max={MAX_PRICE}
												aria-invalid={individualPrice !== null && !individualPriceValid}
												bind:value={individualPrice}
											/>
										</div>
										<div class="flex place-items-center gap-2">
											<div class="bg-background rounded-md px-1 py-0.5 text-sm">one time</div>
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
							class="group text-opacity-0 flex h-0 place-items-center px-6 transition-all data-[visible=true]:h-9"
						>
							<span
								class="text-muted-foreground text-sm opacity-0 group-data-[visible=true]:opacity-100 group-data-[visible=true]:transition-all group-data-[visible=true]:delay-150"
							>
								<span class="text-green-500">
									${calculateCreatorIncome(individualPrice ?? 0, 'dollars')}</span
								> will be paid to you.
							</span>
						</div>
					</div>
					<div
						data-estimate-visible={orgPrice !== null}
						class="bg-card/50 w-full max-w-80 rounded-lg transition-all data-[estimate-visible=false]:mb-9 md:place-self-start"
					>
						<div
							class="bg-card flex w-full max-w-80 flex-col gap-10 rounded-lg border border-dashed p-6"
						>
							<div class="flex flex-col gap-2">
								<div class="flex flex-col gap-2">
									<span class="text-lg font-bold">Organization License</span>
									<div class="flex flex-col gap-2">
										<div class="flex place-items-start gap-1">
											<span class="text-5xl"> $ </span>
											<Input
												class="border-b-border focus-visible:border-b-primary aria-invalid:border-b-destructive aria-invalid:text-destructive h-12 rounded-none border-x-0 border-t-0 border-b bg-transparent px-0 text-5xl! ring-0!"
												placeholder="30"
												type="number"
												min={MIN_PRICE}
												max={MAX_PRICE}
												aria-invalid={orgPrice !== null && !orgPriceValid}
												bind:value={orgPrice}
											/>
										</div>
										<div class="flex place-items-center gap-2">
											<div class="bg-background rounded-md px-1 py-0.5 text-sm">one time</div>
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
							class="group text-opacity-0 flex h-0 place-items-center px-6 transition-all data-[visible=true]:h-9"
						>
							<span
								class="text-muted-foreground text-sm opacity-0 group-data-[visible=true]:opacity-100 group-data-[visible=true]:transition-all group-data-[visible=true]:delay-150"
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
						<div class="bg-card relative flex w-80 flex-col justify-between gap-10 rounded-lg p-6">
							<div class="flex flex-col gap-2">
								<div class="flex flex-col gap-2">
									<span class="text-lg font-bold">Individual License</span>
									<div class="flex flex-col gap-2">
										<div class="flex place-items-start gap-1">
											<span class="text-5xl">
												${(discountedPrice.price / 100).toFixed(2)}
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
											<div class="bg-background rounded-md px-1 py-0.5 text-sm">one time</div>
											{#if discountedPrice.discount}
												<div
													class="rounded-md border-green-400 bg-green-400/20 px-1 py-0.5 text-sm"
												>
													{discountedPrice.discount}% off
												</div>
												{#if price.discountUntil !== null}
													{@const daysLeft = Math.ceil(
														(price.discountUntil.valueOf() - Date.now()) / DAY
													)}
													<div
														class="rounded-md border-blue-400 bg-blue-400/20 px-1 py-0.5 text-sm"
													>
														{daysLeft} day{daysLeft === 1 ? '' : 's'} left
													</div>
												{/if}
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
							{#if data.hasSettingsAccess}
								<Button
									onclick={() => startEditPrice(price)}
									variant="outline"
									class="absolute -top-2 -right-2 rounded-full"
									size="icon"
								>
									<Pencil />
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
						<div class="bg-card relative flex w-80 flex-col justify-between gap-10 rounded-lg p-6">
							<div class="flex flex-col gap-2">
								<div class="flex flex-col gap-2">
									<span class="text-lg font-bold">Organization License</span>
									<div class="flex flex-col gap-2">
										<div class="flex place-items-start gap-1">
											<span class="text-5xl">
												${(discountedPrice.price / 100).toFixed(2)}
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
											<div class="bg-background rounded-md px-1 py-0.5 text-sm">one time</div>
											{#if discountedPrice.discount}
												<div
													class="rounded-md border-green-400 bg-green-400/20 px-1 py-0.5 text-sm"
												>
													{discountedPrice.discount}% off
												</div>
												{#if price.discountUntil !== null}
													{@const daysLeft = Math.ceil(
														(price.discountUntil.valueOf() - Date.now()) / DAY
													)}
													<div
														class="rounded-md border-blue-400 bg-blue-400/20 px-1 py-0.5 text-sm"
													>
														{daysLeft} day{daysLeft === 1 ? '' : 's'} left
													</div>
												{/if}
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
							{#if data.hasSettingsAccess}
								<Button
									onclick={() => startEditPrice(price)}
									variant="outline"
									class="absolute -top-2 -right-2 rounded-full"
									size="icon"
								>
									<Pencil />
								</Button>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
{/if}

{#snippet feature_list({ features }: { features: string[] })}
	<ul class="text-muted-foreground mb-auto flex flex-col gap-2 text-sm">
		{#each features as feature (feature)}
			<li class="flex place-items-start gap-2 text-sm/(--line-height)" style="--line-height: 20px;">
				<span
					data-visible={feature.length > 0}
					class="flex h-(--line-height) place-items-center justify-center opacity-0 data-[visible=true]:opacity-100"
				>
					<Check class="size-4 text-green-400" />
				</span>
				{feature}
			</li>
		{/each}
	</ul>
{/snippet}

<Modal bind:open={showEditPrice} class="p-0">
	{#if editingPrice && originalPrice}
		<div class="flex flex-col place-items-center gap-4 p-4 pt-8">
			<div
				data-estimate-visible={editingPriceCost !== null}
				class="bg-card/50 w-full max-w-80 rounded-lg transition-all data-[estimate-visible=false]:mb-14"
			>
				<div
					class="bg-card flex w-full max-w-80 flex-col gap-10 rounded-lg border border-dashed p-6"
				>
					<div class="flex flex-col gap-2">
						<div class="flex flex-col gap-2">
							<span class="text-lg font-bold">
								{editingPrice.target === 'individual' ? 'Individual' : 'Organization'} License
							</span>
							<div class="flex flex-col gap-2">
								<div class="flex place-items-start gap-1">
									<span class="text-5xl"> $ </span>
									<Input
										class="border-b-border focus-visible:border-b-primary aria-invalid:border-b-destructive aria-invalid:text-destructive h-12 rounded-none border-x-0 border-t-0 border-b bg-transparent px-0 text-5xl! ring-0!"
										placeholder="10"
										type="number"
										min={MIN_PRICE}
										max={MAX_PRICE}
										aria-invalid={editingPriceCost !== null && !editingPriceCostValid}
										bind:value={editingPriceCost}
									/>
								</div>
								<div class="flex place-items-center gap-2">
									<div class="bg-background rounded-md px-1 py-0.5 text-sm">one time</div>
									{#if enableDiscount && editingPrice.discount !== null}
										<div class="rounded-md border-green-400 bg-green-400/20 px-1 py-0.5 text-sm">
											{editingPrice.discount}% off
										</div>
										{#if enableDiscountExpiration && discountUntil !== null}
											{@const daysLeft = Math.ceil(
												(discountUntil.toDate(getLocalTimeZone()).valueOf() - Date.now()) / DAY
											)}
											{#if daysLeft > 0}
												<div class="rounded-md border-blue-400 bg-blue-400/20 px-1 py-0.5 text-sm">
													{daysLeft} day{daysLeft === 1 ? '' : 's'} left
												</div>
											{/if}
										{/if}
									{/if}
								</div>
							</div>
						</div>
						<div>
							{@render feature_list({
								features: ['Lifetime Access', 'Unlimited Downloads', '']
							})}
						</div>
						<Separator />
						<div class="flex flex-col gap-4">
							<div class="flex place-items-center justify-between">
								<span class="text-sm font-medium">Enable Discount</span>
								<Switch bind:checked={enableDiscount} />
							</div>
							{#if enableDiscount}
								<div>
									<Label>Discount %</Label>
									<Input
										bind:value={editingPrice.discount}
										max={100}
										type="number"
										placeholder="0"
									/>
								</div>
								<div class="flex flex-col gap-2">
									<div class="flex place-items-center justify-between">
										<span class="text-sm font-medium">Expiration Date</span>
										<Switch bind:checked={enableDiscountExpiration} />
									</div>
									{#if enableDiscountExpiration}
										<CalendarInput
											type="single"
											bind:value={discountUntil}
											class="rounded-md border"
										/>
									{/if}
								</div>
							{/if}
						</div>
					</div>
					<Button disabled>Buy</Button>
				</div>
				<div
					data-visible={editingPriceCost !== null}
					class="group text-opacity-0 flex h-0 place-items-center px-6 transition-all data-[visible=true]:h-14"
				>
					<span
						class="text-muted-foreground flex w-full flex-col text-sm opacity-0 group-data-[visible=true]:opacity-100 group-data-[visible=true]:transition-all group-data-[visible=true]:delay-150"
					>
						<span>
							User pays
							<span class="text-green-500">
								{(enableDiscount
									? calculateDiscountedPrice({ ...editingPrice, cost: editingPriceCost ?? 0 }).price
									: (editingPriceCost ?? 0)
								).toFixed(2)}
							</span>.
						</span>
						<span>
							<span class="text-green-500">
								${calculateCreatorIncome(
									enableDiscount
										? calculateDiscountedPrice({ ...editingPrice, cost: editingPriceCost ?? 0 })
												.price
										: (editingPriceCost ?? 0),
									'dollars'
								)}</span
							> will be paid to you.
						</span>
					</span>
				</div>
			</div>
			{#if updatePriceQuery.error}
				<span class="text-destructive text-sm">{updatePriceQuery.error.message}</span>
			{/if}
			<div class="flex w-full place-items-center justify-end">
				<Button
					disabled={!canUpdatePrice}
					onclick={updatePriceQuery.run}
					loading={updatePriceQuery.loading}
				>
					Save
				</Button>
			</div>
		</div>
	{/if}
</Modal>
