<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Plus } from '@lucide/svelte';
	import * as List from '$lib/components/site/list';

	let { data } = $props();
</script>

<svelte:head>
	<title>Scopes - Account - jsrepo</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<List.Root title="Your Registries">
		{#snippet actions()}
			<Button
				href="/account/new-registry"
			>
				<Plus /> New
			</Button>
		{/snippet}
		<List.List>
			{#each data.registries.data as registry (registry.id)}
				<List.Registry {registry} />
			{/each}
		</List.List>
	</List.Root>
</div>
