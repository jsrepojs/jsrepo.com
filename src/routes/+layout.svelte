<script lang="ts">
	import Header from '$lib/components/site/header.svelte';
	import { newTokenContext, UseReactive } from '$lib/context.svelte';
	import '../app.css';
	import '@fontsource-variable/oxanium';
	import '@fontsource-variable/jetbrains-mono';
	import { ModeWatcher } from 'mode-watcher';
	import Footer from '$lib/components/site/footer.svelte';

	let { children } = $props();

	newTokenContext.set(new UseReactive(null));
</script>

<ModeWatcher />

<div style="display: contents; --header-height: 4rem;">
	<Header />
	<main class="container relative min-h-[calc(100svh-var(--header-height))]">
		{@render children()}
	</main>
	<Footer />
</div>
