<script lang="ts">
	import Header from '$lib/components/site/header.svelte';
	import { newTokenContext, UseReactive } from '$lib/context.svelte';
	import '../app.css';
	import '@fontsource-variable/oxanium';
	import '@fontsource-variable/jetbrains-mono';
	import { ModeWatcher } from 'mode-watcher';

	let { children } = $props();

	newTokenContext.set(new UseReactive(null));
</script>

<ModeWatcher />

<div style="display: contents; --header-height: 4rem;">
	<Header />
	<main class="relative h-[calc(100svh-64px)]">
		{@render children()}
	</main>
</div>
