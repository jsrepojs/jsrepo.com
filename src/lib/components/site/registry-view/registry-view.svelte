<script lang="ts">
	import { page } from '$app/state';
	import * as List from '$lib/components/site/list';
	import semver from 'semver';
	import type { Manifest } from '$lib/ts/registry/manifest';
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

	let { data }: { data: RegistryViewPageData } = $props();

	const tab = $derived(page.url.searchParams.get('tab') ?? '/');

	let tabListPopoverOpen = $state(false);

	type RegistryInfo = {
		categories: number;
		blocks: number;
		dependencies: string[];
	};

	function getRegistryInfo(manifest: Manifest): RegistryInfo {
		const dependencies = new Set<string>();

		for (const category of manifest.categories) {
			for (const block of category.blocks) {
				for (const dep of [...block.dependencies, ...block.devDependencies]) {
					dependencies.add(dep);
				}
			}
		}

		return {
			categories: manifest.categories.length,
			blocks: manifest.categories.flatMap((c) => c.blocks).length,
			dependencies: Array.from(dependencies)
		};
	}

	const registryInfo = $derived(getRegistryInfo(data.manifest));

	const hasLicense = $derived(
		data.licenses.find((l) => l.registryId === data.registry.id) !== undefined
	);
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
			<span class="font-mono text-sm text-muted-foreground">
				{data.version.version}
			</span>
			<FileIcon extension={data.registry.metaPrimaryLanguage} />
			<span class="text-sm text-muted-foreground">
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
			<Tabs.Tab href="?tab=blocks" isSearch tag={registryInfo.blocks.toString()}>Blocks</Tabs.Tab>
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
				<Tabs.Tab href="?tab=pricing" isSearch class="hidden md:flex">Pricing</Tabs.Tab>
			{/if}
			<Tabs.Tab href="?tab=reviews" isSearch class="hidden md:flex">Reviews</Tabs.Tab>
			{#if data.hasSettingsAccess}
				<Tabs.Tab href="?tab=settings" isSearch class="hidden md:flex">Settings</Tabs.Tab>
			{/if}
		</div>
		<Popover.Root bind:open={tabListPopoverOpen}>
			<Popover.Trigger
				class={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mb-1 md:hidden')}
			>
				<Ellipsis />
			</Popover.Trigger>
			<Popover.Content class="w-48 p-0" align="end" sideOffset={2}>
				<div class="flex flex-col p-1">
					<a
						href="?tab=dependencies"
						onclick={() => (tabListPopoverOpen = false)}
						class="flex place-items-center gap-2 rounded-md px-3 py-2 text-base/(--line-height) hover:bg-accent sm:hidden"
						style="--line-height: 24px;"
					>
						Dependencies
						<div class="flex h-(--line-height) place-items-center justify-center">
							<div
								class="flex size-6 place-items-center justify-center rounded-full bg-primary font-mono text-sm text-primary-foreground"
							>
								{registryInfo.dependencies.length}
							</div>
						</div>
					</a>
					<a
						href="?tab=versions"
						onclick={() => (tabListPopoverOpen = false)}
						class="flex place-items-center gap-2 rounded-md px-3 py-2 text-base/(--line-height) hover:bg-accent sm:hidden"
						style="--line-height: 24px;"
					>
						Versions
						<div class="flex h-(--line-height) place-items-center justify-center">
							<div
								class="flex size-6 place-items-center justify-center rounded-full bg-primary font-mono text-sm text-primary-foreground"
							>
								{data.versions.length}
							</div>
						</div>
					</a>
					{#if data.registry.access === 'marketplace'}
						<a
							href="?tab=pricing"
							onclick={() => (tabListPopoverOpen = false)}
							class="flex place-items-center gap-2 rounded-md px-3 py-2 text-base/(--line-height) hover:bg-accent"
							style="--line-height: 24px;"
						>
							Pricing
						</a>
					{/if}
					<a
						href="?tab=reviews"
						onclick={() => (tabListPopoverOpen = false)}
						class="flex place-items-center gap-2 rounded-md px-3 py-2 text-base/(--line-height) hover:bg-accent"
						style="--line-height: 24px;"
					>
						Reviews
					</a>
					{#if data.hasSettingsAccess}
						<a
							href="?tab=settings"
							onclick={() => (tabListPopoverOpen = false)}
							class="flex place-items-center gap-2 rounded-md px-3 py-2 text-base/(--line-height) hover:bg-accent"
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
			<div class="grid gap-4 py-2 md:grid-cols-[1fr_20rem]">
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
				<Separator class="md:hidden" />
				<div
					class="relative flex w-full flex-col gap-4 overflow-hidden md:col-start-2 md:w-[20rem]"
				>
					<div class="flex flex-col gap-2">
						<Snippet text="jsrepo init @{data.scopeName}/{data.registryName}@{data.versionParam}" />
						<div class="grid grid-cols-[1fr_30px_1fr] place-items-center gap-2">
							<Separator />
							<span class="text-sm text-muted-foreground">or</span>
							<Separator />
						</div>
						<Button
							variant="outline"
							disabled={data.registry.access === 'marketplace' && !hasLicense}
							download="{data.scopeName}_{data.registryName}_blocks.zip"
							href="/api/scopes/@{data.scopeName}/{data.registryName}/v/{data.versionParam}/blocks/download"
						>
							<FileArchive class="size-5 text-muted-foreground" />
							Download
						</Button>
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
						<div class="flex flex-col">
							<Nav.Title>Categories</Nav.Title>
							<span>{registryInfo.categories}</span>
						</div>

						<div class="flex flex-col">
							<Nav.Title>Blocks</Nav.Title>
							<span>{registryInfo.blocks}</span>
						</div>

						<div class="flex flex-col">
							<Nav.Title>Dependencies</Nav.Title>
							<span>{registryInfo.dependencies.length}</span>
						</div>

						<div class="flex flex-col">
							<Nav.Title>Config Files</Nav.Title>
							<span>{(data.manifest.configFiles ?? []).length}</span>
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
					{#each data.manifest.categories as category (category)}
						{#each category.blocks.filter((b) => b.list) as block (block.name)}
							{@const primaryLanguage = determinePrimaryLanguage(block)}
							<Collapsible.Root>
								<List.Item class="p-0 hover:bg-card">
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
												<Download class="size-5 text-muted-foreground" />
											</Button>
											<Collapsible.Trigger>
												{#snippet child({ props })}
													<Button {...props} variant="ghost" size="icon">
														<ChevronRight
															class={cn('size-5 text-muted-foreground', {
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
									<div class="mt-2 flex flex-col gap-2 rounded-md border border-border bg-card p-4">
										<div>
											<span class="font-medium text-muted-foreground">Files</span>
											<ul>
												{#each block.files as file (file)}
													{@const ext = parseFileExtension(file)}
													<li class="flex place-items-center gap-1">
														<div class="flex size-4 place-items-center justify-center">
															<FileIcon extension={ext}>
																{#snippet fallback()}
																	<File class="size-4 text-muted-foreground" />
																{/snippet}
															</FileIcon>
														</div>
														{file}
													</li>
												{/each}
											</ul>
										</div>
										<div>
											<span class="font-medium text-muted-foreground">Remote Dependencies</span>
											<ul>
												{#each [...block.dependencies, ...block.devDependencies] as dep (dep)}
													<li>{dep}</li>
												{/each}
											</ul>
										</div>
										<div>
											<span class="font-medium text-muted-foreground">Local Dependencies</span>
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
				</List.List>
			</List.Root>
		{:else if tab === 'dependencies'}
			<div class="flex flex-col gap-4 py-2">
				{#if registryInfo.dependencies.length === 0}
					<List.Empty>This registry doesn't have any dependencies.</List.Empty>
				{:else}
					<List.Root>
						<List.List>
							{#each registryInfo.dependencies as dependency (dependency)}
								{@const pkg = parsePackageName(dependency).unwrap()}
								<List.Item class="flex place-items-center justify-between">
									<List.Link href="https://npmjs.com/package/{pkg.name}" target="_blank">
										{dependency}
									</List.Link>
								</List.Item>
							{/each}
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
