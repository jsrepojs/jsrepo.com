<script lang="ts">
	import * as List from '$lib/components/site/list';
	import { page } from '$app/state';

	let { data } = $props();
</script>

<svelte:head>
	<title>Registries - {page.params.org} - Organizations - jsrepo</title>
</svelte:head>

{#if data.registries.length === 0}
	<List.Empty>This organization hasn't published any registries yet.</List.Empty>
{:else}
	<List.Root class="py-2">
		<List.List>
			{#each data.registries as registry (registry.id)}
				<List.Registry {registry} />
			{/each}
		</List.List>
	</List.Root>
{/if}
