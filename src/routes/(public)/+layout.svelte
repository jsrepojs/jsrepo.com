<script lang="ts">
	import Header from '$lib/components/site/public/header.svelte';

	let { children } = $props();
</script>

<Header />
<main class="relative h-[calc(100svh-64px)]">
	{@render children()}
</main>
