<script lang="ts">
	import NavMenu from './nav-menu.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowUpRight, Menu, X } from '@lucide/svelte';
	import { Dialog } from 'bits-ui';
	import HeaderOptions from '$lib/auth/components/header-options.svelte';
	import { page } from '$app/state';
	import RegistrySearchCompact from './registry-search-compact.svelte';
	import { untrack } from 'svelte';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import * as Icons from '$lib/components/icons';
	import { shouldShowSearch } from '$lib/context.svelte';
	import { cn } from '$lib/utils/utils';

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
	class="bg-background h-(--header-height) sticky left-0 top-0 z-10 flex w-full flex-col place-items-center justify-center border-b"
>
	<div class="container w-full">
		<div class="h-14.5 flex w-full items-center justify-between gap-6 py-2">
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
						href="https://jsrepo.dev/docs"
						target="_blank"
						class="text-muted-foreground hover:text-foreground data-[active=true]:text-foreground text-nowrap text-sm transition-all"
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
	</div>
	<div
		class={cn('border-border w-full', {
			'border-t': shouldShowSearch() && isMobile.current
		})}
	>
		{#if shouldShowSearch() && isMobile.current}
			<div class="container w-full">
				<div class="h-14.5 flex w-full place-items-center py-2 md:hidden">
					<RegistrySearchCompact {search} />
				</div>
			</div>
		{/if}
	</div>
</header>
