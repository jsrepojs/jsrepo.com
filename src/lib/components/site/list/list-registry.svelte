<script lang="ts">
	import type { RegistryDetails } from '$lib/backend/db/functions';
	import { FileIcon } from '$lib/components/ui/file-icon';
	import ListItem from './list-item.svelte';
	import { Download, EyeOff, Lock, Store } from '@lucide/svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import { getInitials } from '$lib/ts/initials';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import ReviewStars from '../registry-view/review-stars.svelte';
	import { Badge } from '$lib/components/ui/badge';

	type Props = {
		registry: RegistryDetails;
	};

	let { registry }: Props = $props();

	const name = $derived(`@${registry.scope.name}/${registry.name}`);
</script>

<ListItem class="hover:bg-card">
	<div class="flex flex-col gap-2">
		<div class="flex flex-col">
			<div class="flex place-items-center gap-2">
				<a href="/{name}" class="text-lg font-medium underline-offset-2 hover:underline">
					{name}
				</a>
				<FileIcon extension={registry.metaPrimaryLanguage} />
				{#if registry.access === 'private'}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Lock class="size-3.5 text-muted-foreground" />
						</Tooltip.Trigger>
						<Tooltip.Content>Private</Tooltip.Content>
					</Tooltip.Root>
				{:else if registry.access === 'marketplace'}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Store class="size-3.5 text-muted-foreground" />
						</Tooltip.Trigger>
						<Tooltip.Content>Marketplace</Tooltip.Content>
					</Tooltip.Root>
					{#if !registry.listOnMarketplace}
						<Tooltip.Root>
							<Tooltip.Trigger>
								<EyeOff class="size-3.5 text-destructive" />
							</Tooltip.Trigger>
							<Tooltip.Content>Not Listed</Tooltip.Content>
						</Tooltip.Root>
					{/if}
				{/if}
				{#if registry.rating}
					<ReviewStars class="size-4" rating={registry.rating} />
				{/if}
			</div>
			<span class="text-muted-foreground">
				{registry.metaDescription}
			</span>
		</div>
		{#if registry.metaTags}
			<div class="flex flex-wrap place-items-center gap-2">
				{#each registry.metaTags as tag (tag)}
					<Badge href="?q=keywords:{tag}" variant="secondary">{tag}</Badge>
				{/each}
			</div>
		{/if}
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
		<Tooltip.Root>
			<Tooltip.Trigger>
				{registry.monthlyFetches}
				<Download class="inline size-4" />
			</Tooltip.Trigger>
			<Tooltip.Content>Monthly downloads</Tooltip.Content>
		</Tooltip.Root>
	</span>
</ListItem>
