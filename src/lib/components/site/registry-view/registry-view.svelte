<script lang="ts">
	import { page } from '$app/state';
	import * as List from '$lib/components/site/list';
	import semver from 'semver';
	import {
		ChevronRight,
		FlaskRound,
		File,
		Ellipsis,
		Flag,
		Download,
		FileArchive,
		Check
	} from '@lucide/svelte';
	import { cn } from '$lib/utils/utils';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { FileIcon } from '$lib/components/ui/file-icon';
	import { Snippet } from '$lib/components/ui/snippet';
	import * as Tabs from '$lib/components/site/tabs';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Badge } from '$lib/components/ui/badge';
	import '../../../../markdown.css';
	import { Separator } from '$lib/components/ui/separator';
	import * as Popover from '$lib/components/ui/popover';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { parsePackageName } from '$lib/ts/parse-package-name';
	import * as Nav from '$lib/components/site/nav';
	import { toRelative } from '$lib/ts/dates';
	import type { SupportReason } from '$lib/ts/help';
	import { determinePrimaryLanguage, parseFileExtension } from '$lib/ts/registry';
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
	import { SvelteDate, SvelteSet } from 'svelte/reactivity';
	import type { RegistryManifest, RemoteDependency } from '$lib/ts/registry/manifest-v3';

	let { data }: { data: RegistryViewPageData } = $props();

	const tab = $derived(page.url.searchParams.get('tab') ?? '/');

	let tabListPopoverOpen = $state(false);

	export type RegistryInfo = RegistryInfoV2 | RegistryInfoV3;

	type RegistryInfoV2 = {
		version: 'v2';
		categories: number;
		blocks: number;
		dependencies: string[];
	};

	type RegistryInfoV3 = {
		version: 'v3';
		items: number;
		dependencies: RemoteDependency[];
	};

	function getRegistryInfo(manifest: RegistryManifest): RegistryInfoV2 | RegistryInfoV3 {
		if (manifest.manifestVersion === 'v2') {
			const dependencies = new SvelteSet<string>();

			for (const category of manifest.categories) {
				for (const block of category.blocks) {
					for (const dep of [...block.dependencies, ...block.devDependencies]) {
						dependencies.add(dep);
					}
				}
			}

			return {
				version: 'v2',
				categories: manifest.categories.length,
				blocks: manifest.categories.flatMap((c) => c.blocks).length,
				dependencies: Array.from(dependencies)
			};
		} else {
			return {
				version: 'v3',
				items: manifest.items.length,
				dependencies: manifest.items.flatMap((i) => i.remoteDependencies ?? [])
			};
		}
	}

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
		{#if tab === '/'}
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
						<Snippet text="jsrepo init @{data.scopeName}/{data.registryName}@{data.versionParam}" />
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
		{:else if tab === 'blocks'}
			<List.Root class="flex flex-col gap-2 py-2">
				<List.List>
					{#if data.manifest.manifestVersion === 'v2'}
						{#each data.manifest.categories as category (category)}
							{#each category.blocks.filter((b) => b.list) as block (block.name)}
								{@const primaryLanguage = determinePrimaryLanguage(...block.files)}
								<Collapsible.Root>
									<List.Item class="hover:bg-card p-0">
										<div class="flex w-full place-items-center justify-between p-4">
											<div class="flex place-items-center gap-2">
												<span class="font-medium">
													{block.category}/{block.name}
												</span>
												<FileIcon extension={primaryLanguage} />
												{#if block.tests}
													<Tooltip.Provider delayDuration={50}>
														<Tooltip.Root>
															<Tooltip.Trigger>
																<FlaskRound class="size-4 text-blue-400" />
															</Tooltip.Trigger>
															<Tooltip.Content>
																<p>Includes tests</p>
															</Tooltip.Content>
														</Tooltip.Root>
													</Tooltip.Provider>
												{/if}
											</div>
											<div class="flex place-items-center gap-2">
												<Button
													variant="ghost"
													size="icon"
													disabled={data.registry.access === 'marketplace' && !hasLicense}
													download="{category.name}_{block.name}.zip"
													href="/api/scopes/@{data.scopeName}/{data.registryName}/v/{data.versionParam}/blocks/{category.name}/{block.name}/download"
												>
													<Download class="text-muted-foreground size-5" />
												</Button>
												<Collapsible.Trigger>
													{#snippet child({ props })}
														<Button {...props} variant="ghost" size="icon">
															<ChevronRight
																class={cn('text-muted-foreground size-5', {
																	'rotate-90': props['aria-expanded'] === 'true'
																})}
															/>
														</Button>
													{/snippet}
												</Collapsible.Trigger>
											</div>
										</div>
									</List.Item>
									<Collapsible.Content>
										<div
											class="border-border bg-card mt-2 flex flex-col gap-2 rounded-md border p-4"
										>
											<div>
												<span class="text-muted-foreground font-medium">Files</span>
												<ul>
													{#each block.files as file (file)}
														{@const ext = parseFileExtension(file)}
														<li class="flex place-items-center gap-1">
															<div class="flex size-4 place-items-center justify-center">
																<FileIcon extension={ext}>
																	{#snippet fallback()}
																		<File class="text-muted-foreground size-4" />
																	{/snippet}
																</FileIcon>
															</div>
															{file}
														</li>
													{/each}
												</ul>
											</div>
											<div>
												<span class="text-muted-foreground font-medium">Remote Dependencies</span>
												<ul>
													{#each [...block.dependencies, ...block.devDependencies] as dep (dep)}
														<li>{dep}</li>
													{/each}
												</ul>
											</div>
											<div>
												<span class="text-muted-foreground font-medium">Local Dependencies</span>
												<ul>
													{#each block.localDependencies as dep (dep)}
														<li>{dep}</li>
													{/each}
												</ul>
											</div>
										</div>
									</Collapsible.Content>
								</Collapsible.Root>
							{/each}
						{/each}
					{:else}
						{#each data.manifest.items.filter((i) => i.add === 'when-added') as item (item.name)}
							{@const primaryLanguage = determinePrimaryLanguage(...item.files.map((f) => f.path))}
							<Collapsible.Root>
								<List.Item class="hover:bg-card p-0">
									<div class="flex w-full place-items-center justify-between p-4">
										<div class="flex place-items-center gap-2">
											<span class="font-medium">
												{item.name}
											</span>
											<FileIcon extension={primaryLanguage} />
											{#if item.files.some((f) => f.type === 'registry:test')}
												<Tooltip.Provider delayDuration={50}>
													<Tooltip.Root>
														<Tooltip.Trigger>
															<FlaskRound class="size-4 text-blue-400" />
														</Tooltip.Trigger>
														<Tooltip.Content>
															<p>Includes tests</p>
														</Tooltip.Content>
													</Tooltip.Root>
												</Tooltip.Provider>
											{/if}
										</div>
										<div class="flex place-items-center gap-2">
											<Button
												variant="ghost"
												size="icon"
												disabled={data.registry.access === 'marketplace' && !hasLicense}
												download="{item.name}.zip"
												href="/api/scopes/@{data.scopeName}/{data.registryName}/v/{data.versionParam}/items/{item.name}/download"
											>
												<Download class="text-muted-foreground size-5" />
											</Button>
											<Collapsible.Trigger>
												{#snippet child({ props })}
													<Button {...props} variant="ghost" size="icon">
														<ChevronRight
															class={cn('text-muted-foreground size-5', {
																'rotate-90': props['aria-expanded'] === 'true'
															})}
														/>
													</Button>
												{/snippet}
											</Collapsible.Trigger>
										</div>
									</div>
								</List.Item>
								<Collapsible.Content>
									<div class="border-border bg-card mt-2 flex flex-col gap-2 rounded-md border p-4">
										<div>
											<span class="text-muted-foreground font-medium">Files</span>
											<ul>
												{#each item.files as file (file)}
													{@const ext = parseFileExtension(file.path)}
													<li class="flex place-items-center gap-1">
														<div class="flex size-4 place-items-center justify-center">
															<FileIcon extension={ext}>
																{#snippet fallback()}
																	<File class="text-muted-foreground size-4" />
																{/snippet}
															</FileIcon>
														</div>
														{file.path}
													</li>
												{/each}
											</ul>
										</div>
										<div>
											<span class="text-muted-foreground font-medium">Remote Dependencies</span>
											<ul>
												{#each item.remoteDependencies ?? [] as dep (dep.name)}
													<li>{dep.name}{dep.version ? `@${dep.version}` : ''}</li>
												{/each}
											</ul>
										</div>
										<div>
											<span class="text-muted-foreground font-medium">Local Dependencies</span>
											<ul>
												{#each item.registryDependencies ?? [] as dep (dep)}
													<li>{dep}</li>
												{/each}
											</ul>
										</div>
									</div>
								</Collapsible.Content>
							</Collapsible.Root>
						{/each}
					{/if}
				</List.List>
			</List.Root>
		{:else if tab === 'dependencies'}
			<div class="flex flex-col gap-4 py-2">
				{#if registryInfo.dependencies.length === 0}
					<List.Empty>This registry doesn't have any dependencies.</List.Empty>
				{:else}
					<List.Root>
						<List.List>
							{#if registryInfo.version === 'v2'}
								{#each registryInfo.dependencies as dependency (dependency)}
									{@const pkg = parsePackageName(dependency).unwrap()}
									<List.Item class="flex place-items-center justify-between">
										<List.Link href="https://npmjs.com/package/{pkg.name}" target="_blank">
											{dependency}
										</List.Link>
									</List.Item>
								{/each}
							{:else}
								{#each registryInfo.dependencies as dependency (dependency)}
									<List.Item class="flex place-items-center justify-between">
										{#if dependency.ecosystem === 'js'}
											<List.Link href="https://npmjs.com/package/{dependency.name}" target="_blank">
												{dependency.name}{dependency.version ? `@${dependency.version}` : ''}
											</List.Link>
										{:else}
											<span>
												{dependency.name}{dependency.version ? `@${dependency.version}` : ''}
											</span>
										{/if}
									</List.Item>
								{/each}
							{/if}
						</List.List>
					</List.Root>
				{/if}
			</div>
		{:else if tab === 'versions'}
			{@const sortedVersions = data.versions.sort((a, b) => semver.compare(b.version, a.version))}
			{@const taggedVersions = sortedVersions.filter((v) => v.tag !== null)}
			<div class="flex flex-col gap-4 py-2">
				<List.Root title="Tags">
					<List.List>
						{#each taggedVersions as version (version.id)}
							<List.Item class="flex place-items-center justify-between">
								<List.Link href="/@{data.scopeName}/{data.registryName}/v/{version.tag}">
									{version.version}
								</List.Link>
								<span class="font-mono text-sm">@{version.tag}</span>
							</List.Item>
						{/each}
					</List.List>
				</List.Root>
				<List.Root title="Versions">
					<List.List>
						{#each sortedVersions as version (version.id)}
							<List.Item class="flex place-items-center justify-between">
								<List.Link href="/@{data.scopeName}/{data.registryName}/v/{version.version}">
									{version.version}
								</List.Link>
								{#if version.tag}
									<span class="font-mono text-sm">@{version.tag}</span>
								{/if}
							</List.Item>
						{/each}
					</List.List>
				</List.Root>
			</div>
		{:else if tab === 'pricing' && data.registry.access === 'marketplace'}
			<Pricing {data} />
		{:else if tab === 'reviews'}
			<Reviews {data} />
		{:else if tab === 'settings' && data.hasSettingsAccess}
			<Settings {data} />
		{/if}
	</div>
</div>
