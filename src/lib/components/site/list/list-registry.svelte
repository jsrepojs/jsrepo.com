<script lang="ts">
	import type { RegistryDetails } from '$lib/backend/db/functions';
	import ListItem from './list-item.svelte';
	import ListLink from './list-link.svelte';
	import { Download, Lock } from '@lucide/svelte';

	type Props = {
		registry: RegistryDetails;
	};

	let { registry }: Props = $props();

	const name = $derived(`@${registry.scope.name}/${registry.name}`);
</script>

<ListItem>
	<div class="flex flex-col gap-1">
		<div class="flex place-items-center gap-2">
			<ListLink href="/{name}">
				{name}
			</ListLink>
			<span class="hidden font-mono text-sm text-muted-foreground sm:block">
				{registry.latestVersion?.version}
			</span>
			{#if registry.private}
				<Lock class="size-3.5 text-muted-foreground" />
			{/if}
		</div>
		<span class="text-muted-foreground">
			{registry.metaDescription}
		</span>
		<span class="block font-mono text-sm text-muted-foreground sm:hidden">
			{registry.latestVersion?.version}
		</span>
	</div>
	<span class="hidden place-items-center gap-2 font-mono text-sm text-muted-foreground sm:flex">
		{registry.monthlyFetches}
		<Download class="inline size-4" />
	</span>
</ListItem>
