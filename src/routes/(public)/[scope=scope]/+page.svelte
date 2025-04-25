<script lang="ts">
	import * as List from '$lib/components/site/list';

	let { data } = $props();
</script>

<List.Root>
	<List.List>
		{#each data.registries as registry (registry.id)}
			<List.Registry {registry} />
		{/each}
	</List.List>
</List.Root>
