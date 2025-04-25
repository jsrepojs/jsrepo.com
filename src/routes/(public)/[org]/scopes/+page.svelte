<script lang="ts">
	import * as List from '$lib/components/site/list';
	import { page } from '$app/state';

	let { data } = $props();
</script>

<svelte:head>
	<title>Scopes - {page.params.org} - Organizations - jsrepo</title>
</svelte:head>

{#if data.scopes.length === 0}
	<List.Empty>This organization doesn't own any scopes.</List.Empty>
{:else}
	<List.Root class="py-2">
		<List.List>
			{#each data.scopes as scope (scope.id)}
				<List.Scope {scope} />
			{/each}
		</List.List>
	</List.Root>
{/if}
