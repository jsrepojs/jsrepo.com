<script lang="ts">
	import type { RegistryDetails } from '$lib/backend/db/functions';
	import { FileIcon } from '$lib/components/ui/file-icon';
	import ListItem from './list-item.svelte';
	import { Download, Lock, Store } from '@lucide/svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import { getInitials } from '$lib/ts/initials';

	type Props = {
		registry: RegistryDetails;
	};

	let { registry }: Props = $props();

	const name = $derived(`@${registry.scope.name}/${registry.name}`);
</script>

<ListItem class="hover:bg-card">
	<div class="flex flex-col gap-1">
		<div class="flex place-items-center gap-2">
			<a href="/{name}" class="text-lg font-medium underline-offset-2 hover:underline">
				{name}
			</a>
			<FileIcon extension={registry.metaPrimaryLanguage} />
			{#if registry.access === 'private'}
				<Lock class="size-3.5 text-muted-foreground" />
			{:else if registry.access === 'marketplace'}
				<Store class="size-3.5 text-muted-foreground" />
			{/if}
		</div>
		<span class="text-muted-foreground">
			{registry.metaDescription}
		</span>
		<div class="flex place-items-center gap-2">
			{#if registry.releasedBy}
				<a
					href="/users/{registry.releasedBy.username}"
					class="flex place-items-center gap-2 text-muted-foreground transition-all hover:text-foreground"
				>
					<Avatar.Root class="size-5">
						<Avatar.Image src={registry.releasedBy.image} />
						<Avatar.Fallback>{getInitials(registry.releasedBy.name)}</Avatar.Fallback>
					</Avatar.Root>
					<span class="truncate">{registry.releasedBy.username}</span>
				</a>
			{/if}

			<span class="font-mono text-sm text-muted-foreground">
				{registry.latestVersion?.version}
			</span>
		</div>
	</div>
	<span class="hidden place-items-center gap-2 font-mono text-sm text-muted-foreground sm:flex">
		{registry.monthlyFetches}
		<Download class="inline size-4" />
	</span>
</ListItem>
