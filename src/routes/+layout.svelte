<script lang="ts">
	import Header from '$lib/components/site/header.svelte';
	import { newTokenContext, shouldShowSearch, UseReactive } from '$lib/context.svelte';
	import '../app.css';
	import '@fontsource-variable/oxanium';
	import '@fontsource-variable/jetbrains-mono';
	import { ModeWatcher } from 'mode-watcher';
	import Footer from '$lib/components/site/footer.svelte';
	import { Posthog } from '$lib/components/site/posthog';
	import { Toaster } from '$lib/components/ui/sonner';
	import * as Tooltip from '$lib/components/ui/tooltip';

	let { children } = $props();

	newTokenContext.set(new UseReactive(null));
</script>

<ModeWatcher />
<Posthog />
<Toaster />

<Tooltip.Provider delayDuration={50}>
	<div
		data-search-bar={shouldShowSearch()}
		class="[--header-height:3.625rem] data-[search-bar=true]:[--header-height:7.25rem] md:data-[search-bar=true]:[--header-height:3.625rem]"
		style="display: contents;"
	>
		<Header />
		<main class="container relative min-h-[calc(100svh-var(--header-height))]">
			{@render children()}
		</main>
		<Footer />
	</div>
</Tooltip.Provider>
