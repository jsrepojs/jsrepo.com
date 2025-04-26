<script lang="ts">
	import Header from '$lib/components/site/header.svelte';
	import { newTokenContext, UseReactive } from '$lib/context.svelte';
	import '../app.css';
	import '@fontsource-variable/oxanium';
	import '@fontsource-variable/jetbrains-mono';
	import { ModeWatcher } from 'mode-watcher';
	import Footer from '$lib/components/site/footer.svelte';
	import { page } from '$app/state';

	let { children } = $props();

	newTokenContext.set(new UseReactive(null));
</script>

<ModeWatcher />

<div
	data-home={page.url.pathname === '/'}
	class="[--header-height:3.625rem] data-[home=false]:[--header-height:7.25rem] md:data-[home=false]:[--header-height:3.625rem]"
	style="display: contents;"
>
	<Header />
	<main class="container relative min-h-[calc(100svh-var(--header-height))]">
		{@render children()}
	</main>
	<Footer />
</div>
