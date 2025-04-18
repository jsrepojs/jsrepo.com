<script lang="ts">
	import { cn } from '$lib/utils/utils';
	import { Button } from '$lib/components/ui/button';
	import { ThemeSelector } from '$lib/components/ui/theme-selector';
	import * as Icons from '$lib/components/icons';
	import { Dialog } from 'bits-ui';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import * as Nav from '$lib/components/site/nav';

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
</script>

<Dialog.Content
	class={cn(
		'fixed left-0 top-[--header-height] z-50 h-[calc(100svh-var(--header-height))] w-full bg-background'
	)}
>
	<div class="h-[calc(100svh-var(--header-height)-69px)] overflow-y-auto px-8 pb-4">
		<div class="flex flex-col gap-4">
			<Nav.Group title="General">
				<Nav.List>
					<Nav.Link href="/" title="Home" onclick={closeMenu} />
					<Nav.Link href="https://jsrepo.dev" title="Docs" onclick={closeMenu} />
				</Nav.List>
			</Nav.Group>
		</div>
	</div>
	<div class="mx-8 flex place-items-center gap-2 border-t py-4">
		<ThemeSelector class="size-9" />
		<Button
			target="_blank"
			href="https://github.com/jsrepojs/jsrepo"
			variant="outline"
			class="size-9 px-2"
		>
			<span class="sr-only">GitHub</span>
			<Icons.GitHub />
		</Button>
	</div>
</Dialog.Content>
