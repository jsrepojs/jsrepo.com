<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { LightSwitch } from '$lib/components/ui/light-switch';
	import * as Icons from '$lib/components/icons';
	import { Dialog } from 'bits-ui';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import * as Nav from '$lib/components/site/nav';
	import { authClient } from '$lib/auth/client';

	type Props = {
		open?: boolean;
	};

	let { open = $bindable(false) }: Props = $props();

	const isMobile = new IsMobile();

	$effect(() => {
		// close the dialog if we ever come out of mobile mode
		if (!isMobile.current) {
			open = false;
		}
	});

	function closeMenu() {
		open = false;
	}

	const session = authClient.useSession();
</script>

<Dialog.Content
	class={cn(
		'bg-background fixed top-(--header-height) left-0 z-50 h-[calc(100svh-var(--header-height))] w-full'
	)}
>
	<div class="h-[calc(100svh-var(--header-height)-69px)] overflow-y-auto px-8 pb-4">
		<div class="flex flex-col gap-4">
			<Nav.Group title="General">
				<Nav.List>
					<Nav.Link href="/" title="Home" onclick={closeMenu} />
					<Nav.Link href="/pricing" title="Pricing" onclick={closeMenu} />
					<Nav.Link href="https://jsrepo.dev/docs" title="Docs" onclick={closeMenu} />
				</Nav.List>
			</Nav.Group>
			{#if $session.data}
				<Nav.Group title="Account">
					<Nav.List>
						<Nav.Link href="/account" title="Account" onclick={closeMenu} />
						<Nav.Link href="/account/scopes" title="Scopes" onclick={closeMenu} />
						<Nav.Link href="/account/access-tokens" title="Access Tokens" onclick={closeMenu} />
						<Nav.Link href="/account/organizations" title="Organizations" onclick={closeMenu} />
						<Nav.Link href="/account/settings" title="Settings" onclick={closeMenu} />
					</Nav.List>
				</Nav.Group>
			{/if}
		</div>
	</div>
	<div class="mx-8 flex place-items-center justify-between gap-2 border-t py-4">
		<div class="flex place-items-center gap-2">
			<LightSwitch class="size-9" />
			<Button
				target="_blank"
				href="https://github.com/jsrepojs"
				variant="outline"
				class="size-9 px-2"
			>
				<span class="sr-only">GitHub</span>
				<Icons.GitHub />
			</Button>
		</div>
		{#if !$session.data}
			<Button href="/login" onclick={closeMenu}>Sign In</Button>
		{/if}
	</div>
</Dialog.Content>
