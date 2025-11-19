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
	import { page } from '$app/state';

	type Props = {
		registry: RegistryDetails;
	};

	let { registry }: Props = $props();

	const name = $derived(`@${registry.scope.name}/${registry.name}`);
</script>

<ListItem class="hover:bg-card gap-2">
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
							<Lock class="text-muted-foreground size-3.5" />
						</Tooltip.Trigger>
						<Tooltip.Content>Private</Tooltip.Content>
					</Tooltip.Root>
				{:else if registry.access === 'marketplace'}
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Store class="text-muted-foreground size-3.5" />
						</Tooltip.Trigger>
						<Tooltip.Content>Marketplace</Tooltip.Content>
					</Tooltip.Root>
					{#if !registry.listOnMarketplace}
						<Tooltip.Root>
							<Tooltip.Trigger>
								<EyeOff class="text-destructive size-3.5" />
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
					<Badge
						href={page.url.pathname.startsWith('/search') ? `?q=keywords:${tag}` : undefined}
						variant="secondary">{tag}</Badge
					>
				{/each}
			</div>
		{/if}
		<div class="flex place-items-center gap-2">
			{#if registry.releasedBy}
				<a
					href="/users/{registry.releasedBy.username}"
					class="text-muted-foreground hover:text-foreground flex place-items-center gap-2 transition-all"
				>
					<Avatar.Root class="size-5">
						<Avatar.Image src={registry.releasedBy.image} />
						<Avatar.Fallback>{getInitials(registry.releasedBy.name)}</Avatar.Fallback>
					</Avatar.Root>
					<span class="truncate">{registry.releasedBy.username}</span>
				</a>
			{/if}

			<span class="text-muted-foreground font-mono text-sm">
				{registry.latestVersion?.version}
			</span>
		</div>
	</div>
	<span class="text-muted-foreground hidden place-items-center gap-2 font-mono text-sm sm:flex">
		<Tooltip.Root>
			<Tooltip.Trigger class="flex items-center gap-2">
				{registry.monthlyFetches}
				<Download class="inline size-4" />
			</Tooltip.Trigger>
			<Tooltip.Content>Monthly downloads</Tooltip.Content>
		</Tooltip.Root>
	</span>
</ListItem>
