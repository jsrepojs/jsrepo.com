<script lang="ts">
	import Layout from './layout.svelte';

	let { data, children } = $props();
</script>

<Layout {data} {children} />
