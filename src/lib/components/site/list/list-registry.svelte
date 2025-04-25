<script lang="ts">
	import type { RegistryDetails } from '$lib/backend/db/functions';
	import ListItem from './list-item.svelte';
	import ListLink from './list-link.svelte';
	import { Lock } from '@lucide/svelte';

	type Props = {
		registry: RegistryDetails;
	};

	let { registry }: Props = $props();

	const name = $derived(`@${registry.scope.name}/${registry.name}`);
</script>

<ListItem>
	<div class="flex flex-col">
		<div class="flex place-items-center gap-2">
			<ListLink href="/{name}">
				{name}
			</ListLink>
			{#if registry.private}
				<Lock class="size-3.5 text-muted-foreground" />
			{/if}
		</div>
		<span class="font-mono text-sm text-muted-foreground">
			{registry.latestVersion?.version}
		</span>
	</div>
</ListItem>
