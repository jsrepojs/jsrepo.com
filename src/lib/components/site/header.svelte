<script lang="ts">
	import NavMenu from './nav-menu.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowUpRight, Menu, X } from '@lucide/svelte';
	import { Dialog } from 'bits-ui';
	import { active } from '$lib/actions/active.svelte';
	import HeaderOptions from '$lib/auth/components/header-options.svelte';

	let menuOpen = $state(false);
</script>

<header
	class="sticky left-0 top-0 z-10 flex h-[--header-height] w-full items-center border-b bg-background"
>
	<div class="container flex items-center justify-between">
		<div class="flex place-items-center gap-6">
			<a
				href="/"
				class="flex h-9 w-fit place-items-center justify-center bg-primary p-1 font-mono font-bold text-primary-foreground"
			>
				jsrepo
			</a>
			<div class="hidden place-content-center gap-4 md:flex">
				<a
					href="https://docs.jsrepo.dev/docs"
					class="text-sm text-muted-foreground transition-all hover:text-foreground data-[active=true]:text-foreground"
					use:active={{ activeForSubdirectories: true }}
				>
					Docs
					<ArrowUpRight class="inline size-4" />
				</a>
			</div>
		</div>

		<div class="flex place-items-center gap-2">
			<HeaderOptions />
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
</header>
