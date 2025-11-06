<script lang="ts">
	import { page } from '$app/state';
	import { setupRegistry } from '$lib/components/site/registry-view/registry-manager.svelte.js';
	import ReviewStars from '$lib/components/site/registry-view/review-stars.svelte';
	import { FileIcon } from '$lib/components/ui/file-icon/index.js';
	import { toRelative } from '$lib/ts/dates.js';
	import { MetaTags } from 'svelte-meta-tags';
	import * as Tabs from '$lib/components/site/tabs';
	import * as Popover from '$lib/components/ui/popover';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils/utils.js';
	import { Ellipsis } from '@lucide/svelte';
	import { PageBanner } from '$lib/components/site/page-banner';
	import { Link } from '$lib/components/ui/link';

	let { data, children } = $props();

	const registryManager = setupRegistry({
		version: data.version,
		manifest: data.manifest,
		settingsAccess: data.settingsAccess
	});

	let tabListPopoverOpen = $state(false);
</script>

<MetaTags
	title="{page.params.scope}/{page.params.name}@{page.params.version ?? 'latest'} - jsrepo"
	description={registryManager.description}
/>

<div class="flex flex-col">
	{#if registryManager.registry.access === 'marketplace'}
		{#await registryManager.settingsAccess then settingsAccess}
			{#if settingsAccess}
				{#if registryManager.registry.stripeConnectAccountId === null}
					<PageBanner>
						You need to link your Stripe account before users can pay for your registry! You can
						link it
						<Link href="?tab=settings">here</Link>.
					</PageBanner>
				{:else if data.prices.length === 0}
					<PageBanner>
						You need to setup prices for your registry so that users can pay for it. You can set
						them up
						<Link href="?tab=pricing">here</Link>.
					</PageBanner>
				{:else if !registryManager.registry.listOnMarketplace}
					<PageBanner>
						You need to list your registry before users can see it on the marketplace. You can list
						it
						<Link href="?tab=settings">here</Link>.
					</PageBanner>
				{/if}
			{/if}
		{/await}
	{/if}
	<div class="flex flex-col gap-1 py-6">
		<div class="flex place-items-center gap-2">
			<h1 class="text-4xl font-bold">
				<a href="/@{registryManager.scope.name}" class="underline-offset-2 hover:underline">
					@{registryManager.scope.name}
				</a>/{registryManager.registry.name}
			</h1>
			<!-- {#if hasLicense}
				<Tooltip.Provider delayDuration={50}>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Check class="size-5 text-green-500" />
						</Tooltip.Trigger>
						<Tooltip.Content>You have access.</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			{/if} -->
		</div>
		<div class="relative flex flex-wrap place-items-center gap-2">
			<span class="text-muted-foreground font-mono text-sm">
				{data.version.version}
			</span>
			<FileIcon extension={registryManager.registry.metaPrimaryLanguage} />
			<span class="text-muted-foreground text-sm">
				Published {toRelative(data.version.createdAt)}
			</span>
			{#if registryManager.registry.rating}
				<ReviewStars rating={registryManager.registry.rating} class="size-4" fill="border" />
			{/if}
		</div>
		{#if registryManager.registry.metaDescription}
			<p class="text-muted-foreground">{registryManager.registry.metaDescription}</p>
		{/if}
	</div>
	<Tabs.Root class="flex place-items-end justify-between">
		<div class="flex place-items-end">
			<Tabs.Tab href="?tab=/" isSearch>README</Tabs.Tab>
			{#if registryManager.info.version === 'v2'}
				<Tabs.Tab href="?tab=blocks" isSearch tag={registryManager.info.blocks.toString()}
					>Blocks</Tabs.Tab
				>
			{:else}
				<Tabs.Tab href="?tab=blocks" isSearch tag={registryManager.info.items.toString()}
					>Items</Tabs.Tab
				>
			{/if}
			<Tabs.Tab
				href="?tab=dependencies"
				isSearch
				class="hidden sm:flex"
				tag={registryManager.info.dependencies.toString()}
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
			{#if registryManager.registry.access === 'marketplace'}
				<Tabs.Tab href="?tab=pricing" isSearch class="hidden lg:flex">Pricing</Tabs.Tab>
			{/if}
			<Tabs.Tab href="?tab=reviews" isSearch class="hidden lg:flex">Reviews</Tabs.Tab>
			<!-- {#if data.hasSettingsAccess}
				<Tabs.Tab href="?tab=settings" isSearch class="hidden lg:flex">Settings</Tabs.Tab>
			{/if} -->
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
								{registryManager.info.dependencies.toString()}
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
					{#if registryManager.registry.access === 'marketplace'}
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
					<!-- {#if data.hasSettingsAccess}
						<a
							href="?tab=settings"
							onclick={() => (tabListPopoverOpen = false)}
							class="hover:bg-accent flex place-items-center gap-2 rounded-md px-3 py-2 text-base/(--line-height)"
							style="--line-height: 24px;"
						>
							Settings
						</a>
					{/if} -->
				</div>
			</Popover.Content>
		</Popover.Root>
	</Tabs.Root>
</div>
{@render children()}
