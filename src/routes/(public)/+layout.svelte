<script lang="ts">
	import Header from '$lib/components/site/public/header.svelte';

	let { children } = $props();
</script>

<Header />
<main class="h-[calc(100svh-64px)] relative">
	{@render children()}
</main>
