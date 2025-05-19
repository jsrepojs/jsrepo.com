<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Plus } from '@lucide/svelte';
	import * as List from '$lib/components/site/list';
	import { MetaTags } from '$lib/components/site/meta-tags';

	let { data } = $props();
</script>

<MetaTags title="Registries - Account - jsrepo" />

<div class="flex flex-col gap-4">
	<List.Root>
		{#snippet actions()}
			<Button href="/account/new-registry">
				<Plus /> New
			</Button>
		{/snippet}
		{#if data.registries.data.length === 0}
			<List.Empty>You haven't published any registries yet.</List.Empty>
		{:else}
			<List.List>
				{#each data.registries.data as registry (registry.id)}
					<List.Registry {registry} />
				{/each}
			</List.List>
		{/if}
	</List.Root>
</div>
