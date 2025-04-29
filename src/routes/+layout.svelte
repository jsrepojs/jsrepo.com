<script lang="ts">
	import Header from '$lib/components/site/header.svelte';
	import { newTokenContext, shouldShowSearch, UseReactive } from '$lib/context.svelte';
	import '../app.css';
	import '@fontsource-variable/oxanium';
	import '@fontsource-variable/jetbrains-mono';
	import { ModeWatcher } from 'mode-watcher';
	import Footer from '$lib/components/site/footer.svelte';
	import { Posthog } from '$lib/components/site/posthog';

	let { children } = $props();

	newTokenContext.set(new UseReactive(null));
</script>

<ModeWatcher />
<Posthog />

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

<div class="fixed bottom-0 left-0 flex w-full place-items-center bg-destructive py-2">
	<div class="container flex place-items-center">
		<span>
			This is an pre-production preview of jsrepo.com. You should not expect any data to be retained
			when it launches.
		</span>
	</div>
</div>
