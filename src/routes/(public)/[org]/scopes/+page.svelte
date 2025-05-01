<script lang="ts">
	import * as List from '$lib/components/site/list';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Plus } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Scopes - {page.params.org} - Organizations - jsrepo</title>
</svelte:head>

<div class="flex flex-col gap-2">
	{#if data.member !== null}
		<div class="flex place-items-center justify-end">
			<Button href="/account/scopes/new?org={data.org.name}">
				<Plus />
				New
			</Button>
		</div>
	{/if}
	{#if data.scopes.length === 0}
		<List.Empty>This organization doesn't own any scopes.</List.Empty>
	{:else}
		<List.Root>
			<List.List>
				{#each data.scopes as scope (scope.id)}
					<List.Scope {scope} />
				{/each}
			</List.List>
		</List.Root>
	{/if}
</div>
