<script lang="ts">
	import * as List from '$lib/components/site/list';
	import { page } from '$app/state';
	import { Lock } from '@lucide/svelte';

	let { data } = $props();
</script>

<List.Root>
	<List.List>
		{#each data.registries as registry (registry.id)}
			<List.Item>
				<List.Link
					href="/{page.params.scope}/{registry.name}"
					class="flex place-items-center gap-2"
				>
					{page.params.scope}/{registry.name}
					{#if registry.private}
						<Lock class="size-4 text-muted-foreground" />
					{/if}
				</List.Link>
			</List.Item>
		{/each}
	</List.List>
</List.Root>
