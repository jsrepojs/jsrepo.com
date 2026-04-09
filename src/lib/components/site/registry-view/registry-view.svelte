<script lang="ts">
	import { page } from '$app/state';
	import * as List from '$lib/components/site/list';
	import { Ellipsis, Flag, FileArchive, Check } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import { FileIcon } from '$lib/components/ui/file-icon';
	import { Snippet } from '$lib/components/ui/snippet';
	import * as Tabs from '$lib/components/site/tabs';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Badge } from '$lib/components/ui/badge';
	import '../../../../markdown.css';
	import { Separator } from '$lib/components/ui/separator';
	import * as Popover from '$lib/components/ui/popover';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Nav from '$lib/components/site/nav';
	import { toRelative } from '$lib/ts/dates';
	import type { SupportReason } from '$lib/ts/help';
	import Pricing from './pricing.svelte';
	import type { RegistryViewPageData } from './types';
	import Settings from './settings.svelte';
	import { Link } from '$lib/components/ui/link';
	import { PageBanner } from '../page-banner';
	import Reviews from './reviews.svelte';
	import ReviewStars from './review-stars.svelte';
	import { MetaTags } from '../meta-tags';
	import * as Chart from '$lib/components/ui/chart';
	import { Area, AreaChart, Highlight, Layer, type ChartContextValue } from 'layerchart';
	import { scaleUtc } from 'd3-scale';
	import { UsePromise } from '$lib/hooks/use-promise.svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import Versions from './versions.svelte';
	import { getRegistryInfo } from './registry-view.svelte.js';
	import Dependencies from './dependencies.svelte';
	import ItemsView from './items-view.svelte';

	let { data }: { data: RegistryViewPageData } = $props();

	let tabListPopoverOpen = $state(false);

	const registryInfo = $derived(getRegistryInfo(data.manifest));

	const hasLicense = $derived(
		data.licenses.find((l) => l.registryId === data.registry.id) !== undefined
	);

	let chartContext = $state<ChartContextValue>();

	function displayWeekRangeFromDate(date: Date) {
		const startOfWeek = new SvelteDate(date);
		startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
		const endOfWeek = new SvelteDate(startOfWeek);
		endOfWeek.setDate(endOfWeek.getDate() + 6);

		const format = (d: Date) =>
			`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

		return `${format(startOfWeek)} to ${format(endOfWeek)}`;
	}

	const weeklyDownloadsPromise = new UsePromise(data.weeklyDownloads, []);
</script>

<MetaTags
	title="@{data.scopeName}/{data.registryName}@{data.versionParam} - jsrepo"
	description={data.registry.metaDescription ?? undefined}
/>

<div class="flex flex-col">
	{#if data.registry.access === 'marketplace'}
		{#if data.hasSettingsAccess && data.registry.connectedStripeAccount === null}
			<PageBanner>
				You need to link your Stripe account before users can pay for your registry! You can link it
				<Link href="?tab=settings">here</Link>.
			</PageBanner>
		{:else if data.prices.length === 0}
			<PageBanner>
				You need to setup prices for your registry so that users can pay for it. You can set them up
				<Link href="?tab=pricing">here</Link>.
			</PageBanner>
		{:else if !data.registry.listOnMarketplace}
			<PageBanner>
				You need to list your registry before users can see it on the marketplace. You can list it
				<Link href="?tab=settings">here</Link>.
			</PageBanner>
		{/if}
	{/if}
	<div class="flex flex-col gap-1 py-6">
		<div class="flex place-items-center gap-2">
			<h1 class="text-4xl font-bold">
				<a href="/@{data.scopeName}" class="underline-offset-2 hover:underline">
					@{data.scopeName}
				</a>/{data.registryName}
			</h1>
			{#if hasLicense}
				<Tooltip.Provider delayDuration={50}>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Check class="size-5 text-green-500" />
						</Tooltip.Trigger>
						<Tooltip.Content>You have access.</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			{/if}
		</div>
		<div class="relative flex flex-wrap place-items-center gap-2">
			<span class="text-muted-foreground font-mono text-sm">
				{data.version.version}
			</span>
			<FileIcon extension={data.registry.metaPrimaryLanguage} />
			<span class="text-muted-foreground text-sm">
				Published {toRelative(data.version.createdAt)}
			</span>
			{#if data.registry.rating}
				<ReviewStars rating={data.registry.rating} class="size-4" fill="border" />
			{/if}
		</div>
		{#if data.registry.metaDescription}
			<p class="text-muted-foreground">{data.registry.metaDescription}</p>
		{/if}
	</div>
	<Tabs.Root class="flex place-items-end justify-between">
		<div class="flex place-items-end">
			<Tabs.Tab href="?tab=/" isSearch>README</Tabs.Tab>
			{#if registryInfo.version === 'v2'}
				<Tabs.Tab href="?tab=blocks" isSearch tag={registryInfo.blocks.toString()}>Blocks</Tabs.Tab>
			{:else}
				<Tabs.Tab href="?tab=blocks" isSearch tag={registryInfo.items.toString()}>Items</Tabs.Tab>
			{/if}
			<Tabs.Tab
				href="?tab=dependencies"
				isSearch
				class="hidden sm:flex"
				tag={registryInfo.dependencies.length.toString()}
			>
				Dependencies
			</Tabs.Tab>
			<Tabs.Tab
				href="?tab=versions"
				isSearch
				class="hidden sm:flex"
				tag={data.versions.length.toString()}
			>
				Versions
			</Tabs.Tab>
			{#if data.registry.access === 'marketplace'}
				<Tabs.Tab href="?tab=pricing" isSearch class="hidden lg:flex">Pricing</Tabs.Tab>
			{/if}
			<Tabs.Tab href="?tab=reviews" isSearch class="hidden lg:flex">Reviews</Tabs.Tab>
			{#if data.hasSettingsAccess}
				<Tabs.Tab href="?tab=settings" isSearch class="hidden lg:flex">Settings</Tabs.Tab>
			{/if}
		</div>
		<Popover.Root bind:open={tabListPopoverOpen}>
			<Popover.Trigger
				class={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mb-1 lg:hidden')}
			>
				<Ellipsis />
			</Popover.Trigger>
			<Popover.Content class="w-48 p-0" align="end" sideOffset={2}>
				<div class="flex flex-col p-1">
					<a
						href="?tab=dependencies"
						onclick={() => (tabListPopoverOpen = false)}
						class="hover:bg-accent flex place-items-center gap-2 rounded-md px-3 py-2 text-base/(--line-height) sm:hidden"
						style="--line-height: 24px;"
					>
						Dependencies
						<div class="flex h-(--line-height) place-items-center justify-center">
							<div
								class="bg-primary text-primary-foreground flex size-6 place-items-center justify-center rounded-full font-mono text-sm"
							>
								{registryInfo.dependencies.length}
							</div>
						</div>
					</a>
					<a
						href="?tab=versions"
						onclick={() => (tabListPopoverOpen = false)}
						class="hover:bg-accent flex place-items-center gap-2 rounded-md px-3 py-2 text-base/(--line-height) sm:hidden"
						style="--line-height: 24px;"
					>
						Versions
						<div class="flex h-(--line-height) place-items-center justify-center">
							<div
								class="bg-primary text-primary-foreground flex size-6 place-items-center justify-center rounded-full font-mono text-sm"
							>
								{data.versions.length}
							</div>
						</div>
					</a>
					{#if data.registry.access === 'marketplace'}
						<a
							href="?tab=pricing"
							onclick={() => (tabListPopoverOpen = false)}
							class="hover:bg-accent flex place-items-center gap-2 rounded-md px-3 py-2 text-base/(--line-height)"
							style="--line-height: 24px;"
						>
							Pricing
						</a>
					{/if}
					<a
						href="?tab=reviews"
						onclick={() => (tabListPopoverOpen = false)}
						class="hover:bg-accent flex place-items-center gap-2 rounded-md px-3 py-2 text-base/(--line-height)"
						style="--line-height: 24px;"
					>
						Reviews
					</a>
					{#if data.hasSettingsAccess}
						<a
							href="?tab=settings"
							onclick={() => (tabListPopoverOpen = false)}
							class="hover:bg-accent flex place-items-center gap-2 rounded-md px-3 py-2 text-base/(--line-height)"
							style="--line-height: 24px;"
						>
							Settings
						</a>
					{/if}
				</div>
			</Popover.Content>
		</Popover.Root>
	</Tabs.Root>
	<div class="w-full">
		{#if page.url.searchParams.get('tab') === '/' || page.url.searchParams.get('tab') === null}
			<div class="grid gap-4 py-2 lg:grid-cols-[1fr_24rem]">
				<div class="relative col-start-1 flex max-w-full flex-col gap-6 overflow-hidden">
					{#if data.readme === null}
						<List.Empty>This registry doesn't have a README.</List.Empty>
					{:else}
						<div class="prose relative max-w-full overflow-hidden">
							{@html data.readme}
						</div>
					{/if}
					<Button
						href="/help?reason={'suspicious-registry' as SupportReason}&subject={`@${data.scopeName}/${data.registryName} is suspicious`}"
						variant="destructive"
						class="w-fit"
					>
						<Flag />
						Report Registry
					</Button>
				</div>
				<Separator class="lg:hidden" />
				<div
					class="relative flex w-full flex-col gap-4 overflow-hidden lg:col-start-2 lg:w-[24rem]"
				>
					<div class="flex flex-col gap-2">
						{#if registryInfo.version === 'v2'}
							<Snippet
								text="jsrepo@2 init @{data.scopeName}/{data.registryName}@{data.versionParam}"
							/>
						{:else}
							<Snippet
								text="jsrepo init @{data.scopeName}/{data.registryName}@{data.versionParam}"
							/>
						{/if}
						<div class="grid grid-cols-[1fr_30px_1fr] place-items-center gap-2">
							<Separator />
							<span class="text-muted-foreground text-sm">or</span>
							<Separator />
						</div>
						{#if registryInfo.version === 'v2'}
							<Button
								variant="outline"
								disabled={data.registry.access === 'marketplace' && !hasLicense}
								download="@{data.scopeName}/{data.registryName}.zip"
								href="/api/scopes/@{data.scopeName}/{data.registryName}/v/{data.versionParam}/blocks/download"
							>
								<FileArchive class="text-muted-foreground size-5" />
								Download
							</Button>
						{:else}
							<Button
								variant="outline"
								disabled={data.registry.access === 'marketplace' && !hasLicense}
								download="@{data.scopeName}/{data.registryName}.zip"
								href="/api/scopes/@{data.scopeName}/{data.registryName}/v/{data.versionParam}/download"
							>
								<FileArchive class="text-muted-foreground size-5" />
								Download
							</Button>
						{/if}
					</div>
					{#if data.registry.metaTags}
						<div class="flex flex-wrap gap-2">
							{#each data.registry.metaTags as tag (tag)}
								<Badge>{tag}</Badge>
							{/each}
						</div>
						<Separator />
					{/if}
					{#if data.registry.metaRepository}
						<div class="flex flex-col gap-2">
							<Nav.Title>Repository</Nav.Title>
							<a
								href={data.registry.metaRepository}
								target="_blank"
								class="truncate transition-all hover:underline"
							>
								{data.registry.metaRepository}
							</a>
						</div>
						<Separator />
					{/if}
					{#if data.registry.metaHomepage}
						<div class="flex flex-col gap-2">
							<Nav.Title>Homepage</Nav.Title>
							<a
								href={data.registry.metaHomepage}
								target="_blank"
								class="truncate transition-all hover:underline"
							>
								{data.registry.metaHomepage}
							</a>
						</div>
						<Separator />
					{/if}
					<div class="grid w-fit grid-cols-2 gap-4">
						{#if registryInfo.version === 'v2'}
							<div class="flex flex-col">
								<Nav.Title>Categories</Nav.Title>
								<span>{registryInfo.categories}</span>
							</div>
							<div class="flex flex-col">
								<Nav.Title>Blocks</Nav.Title>
								<span>{registryInfo.blocks}</span>
							</div>
						{:else}
							<div class="flex flex-col">
								<Nav.Title>Items</Nav.Title>
								<span>{registryInfo.items}</span>
							</div>
						{/if}

						<div class="flex flex-col">
							<Nav.Title>Dependencies</Nav.Title>
							<span>{registryInfo.dependencies.length}</span>
						</div>

						{#if data.manifest.manifestVersion === 'v2'}
							<div class="flex flex-col">
								<Nav.Title>Config Files</Nav.Title>
								<span>{(data.manifest.configFiles ?? []).length}</span>
							</div>
						{/if}
					</div>
					<Separator />
					<div class="flex flex-col">
						<Nav.Title>
							{chartContext?.tooltip?.data?.date
								? displayWeekRangeFromDate(chartContext.tooltip.data.date)
								: 'Weekly Downloads'}
						</Nav.Title>
						<div class="border-primary/50 grid grid-cols-[1fr_1fr] border-b-2">
							<div class="col-start-1 flex place-items-end">
								<span class="text-lg font-medium">
									{chartContext?.tooltip?.data?.downloads ??
										weeklyDownloadsPromise.current?.[weeklyDownloadsPromise.current?.length - 1]
											?.count ??
										0}
								</span>
							</div>
							<div class="col-start-2 w-full">
								<Chart.Container
									class="[&_.lc-highlight-line]:stroke-primary! h-10 w-full [&_.lc-highlight-line]:stroke-2"
									config={{ downloads: { label: 'Downloads', color: 'var(--chart-1)' } }}
								>
									<AreaChart
										data={weeklyDownloadsPromise.current?.map((w) => ({
											date: new Date(w.sow),
											downloads: w.count
										}))}
										x="date"
										renderContext="svg"
										xScale={scaleUtc()}
										yDomain={[0, null]}
										series={[
											{
												key: 'downloads',
												label: 'Weekly Downloads',
												color: 'var(--chart-1)'
											}
										]}
										tooltip={{ mode: 'bisect-x' }}
										axis={false}
										bind:context={chartContext}
									>
										<Layer type="svg">
											<Area line={{ class: 'stroke-2 stroke-primary' }} class="fill-primary/30" />
											<Highlight lines axis="x" />
										</Layer>
									</AreaChart>
								</Chart.Container>
							</div>
						</div>
					</div>
					{#if data.registry.metaAuthors}
						<Separator />
						<div class="flex flex-col gap-2">
							<Nav.Title>Authors</Nav.Title>
							<ul class="flex flex-wrap gap-2">
								{#each data.registry.metaAuthors as author, i (author + i)}
									<li>{author}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			</div>
		{:else if page.url.searchParams.get('tab') === 'blocks'}
			<ItemsView {data} {hasLicense} />
		{:else if page.url.searchParams.get('tab') === 'dependencies'}
			<Dependencies {registryInfo} />
		{:else if page.url.searchParams.get('tab') === 'versions'}
			<Versions {data} />
		{:else if page.url.searchParams.get('tab') === 'pricing' && data.registry.access === 'marketplace'}
			<Pricing {data} />
		{:else if page.url.searchParams.get('tab') === 'reviews'}
			<Reviews {data} />
		{:else if page.url.searchParams.get('tab') === 'settings' && data.hasSettingsAccess}
			<Settings {data} />
		{/if}
	</div>
</div>
