<script lang="ts">
	import * as List from '$lib/components/site/list';

	let { data } = $props();
</script>

{#if data.registries.length === 0}
	<List.Empty>There are no registries published under this scope yet.</List.Empty>
{:else}
	<List.Root>
		<List.List>
			{#each data.registries as registry (registry.id)}
				<List.Registry {registry} />
			{/each}
		</List.List>
	</List.Root>
{/if}
