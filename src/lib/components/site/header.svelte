<script lang="ts">
	import NavMenu from './nav-menu.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowUpRight, Menu, X } from '@lucide/svelte';
	import { Dialog } from 'bits-ui';
	import { active } from '$lib/actions/active.svelte';
	import HeaderOptions from '$lib/auth/components/header-options.svelte';
	import { page } from '$app/state';
	import RegistrySearchCompact from './registry-search-compact.svelte';
	import { untrack } from 'svelte';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import * as Icons from '$lib/components/icons';
	import { shouldShowSearch } from '$lib/context.svelte';

	let menuOpen = $state(false);
	let search = $state(page.url.searchParams.get('q') ?? '');

	const isMobile = new IsMobile();

	$effect(() => {
		const value = page.url.searchParams.get('q');

		untrack(() => {
			search = value ?? '';
		});
	});
</script>

<header
	class="sticky left-0 top-0 z-10 flex h-[--header-height] w-full flex-col place-items-center justify-center border-b bg-background"
>
	<div class="container flex h-[3.625rem] items-center justify-between gap-6 py-2">
		<div class="flex place-items-center gap-6">
			<a href="/">
				<Icons.Jsrepo class="size-9" />
			</a>
		</div>

		{#if shouldShowSearch() && !isMobile.current}
			<RegistrySearchCompact {search} />
		{/if}

		<div class="flex place-items-center gap-6">
			<div class="hidden place-content-center gap-4 md:flex">
				<a
					href="/pricing"
					class="text-nowrap text-sm text-muted-foreground transition-all hover:text-foreground data-[active=true]:text-foreground"
					use:active={{ activeForSubdirectories: true }}
				>
					Pricing
				</a>
				<a
					href="https://jsrepo.dev/docs"
					target="_blank"
					class="text-nowrap text-sm text-muted-foreground transition-all hover:text-foreground data-[active=true]:text-foreground"
				>
					Docs
					<ArrowUpRight class="inline size-4" />
				</a>
			</div>
			<div class="hidden md:contents">
				<HeaderOptions />
			</div>
			<Dialog.Root bind:open={menuOpen}>
				<Dialog.Trigger>
					{#snippet child({ props })}
						<Button {...props} class="md:hidden" size="icon" variant="ghost">
							{#if menuOpen}
								<X />
							{:else}
								<Menu />
							{/if}
						</Button>
					{/snippet}
				</Dialog.Trigger>
				<NavMenu bind:open={menuOpen} />
			</Dialog.Root>
		</div>
	</div>
	{#if shouldShowSearch() && isMobile.current}
		<div
			class="container flex h-[3.625rem] w-full place-items-center border-t border-border py-2 md:hidden"
		>
			<RegistrySearchCompact {search} />
		</div>
	{/if}
</header>
