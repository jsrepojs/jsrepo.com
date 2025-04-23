<script lang="ts">
	import { authClient } from '$lib/auth/client.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { toRelative } from '$lib/ts/dates';
	import { ChevronLeft, Plus, X } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { cn } from '$lib/utils/utils.js';
	import { onMount } from 'svelte';
	import { newTokenContext } from '$lib/context.svelte.js';
	import { Snippet } from '$lib/components/ui/snippet/index.js';
	import * as List from '$lib/components/site/list';

	let { data } = $props();

	type MinAPIKey = {
		id: string;
		name: string | null;
		createdAt: Date | null;
		expiresAt: Date | null;
	};

	let apiKeys = $state(data.apiKeys);

	const newKeyCtx = newTokenContext.get();

	let newKey = $state($state.snapshot(newKeyCtx.current));

	let deletingKey = $state(false);
	let keyToDelete = $state<MinAPIKey>();

	let deleteDialogOpen = $state(false);

	async function deleteApiKey() {
		if (!keyToDelete) return;

		deletingKey = true;

		const result = await authClient.apiKey.delete({ keyId: keyToDelete.id });

		if (result.data?.success) {
			// fetch tokens
			const keys = await authClient.apiKey.list();

			if (keys.data !== null) {
				apiKeys = keys.data.sort((a, b) => a.createdAt.valueOf() - b.createdAt.valueOf());
				if (newKey?.id === keyToDelete.id) {
					newKey = null;
				}
			}
		}

		deletingKey = false;

		deleteDialogOpen = false;
	}

	onMount(() => {
		newKeyCtx.current = null;
	});
</script>

<svelte:head>
	<title>Access Tokens - Account - jsrepo</title>
</svelte:head>

<Dialog.Root bind:open={deleteDialogOpen}>
	<div class="flex flex-col gap-2">
		<a
			href="/account"
			class="flex place-items-center gap-2 py-2 text-muted-foreground transition-all hover:text-foreground"
		>
			<ChevronLeft />
			Back to Account
		</a>
		<List.Root title="Your Access Tokens">
			{#snippet actions()}
				<Button href="/account/access-tokens/new">
					<Plus /> New
				</Button>
			{/snippet}
			{#if newKey}
				<Snippet text={newKey.key} variant="secondary" />
			{/if}
			<List.List>
				{#each apiKeys as apiKey (apiKey.id)}
					<List.Item class="flex place-items-center justify-between">
						<span class="text-lg font-medium">{apiKey.name}</span>
						<div class="flex place-items-center gap-2">
							<span class="text-sm text-muted-foreground">
								Expires {apiKey.expiresAt ? toRelative(apiKey.expiresAt) : 'never'}
							</span>
							<Dialog.Trigger
								onclick={() => (keyToDelete = apiKey)}
								class={cn(
									buttonVariants({ variant: 'outline', size: 'icon' }),
									'size-5 text-destructive hover:text-destructive'
								)}
							>
								<X />
							</Dialog.Trigger>
						</div>
					</List.Item>
				{/each}
			</List.List>
		</List.Root>
	</div>

	<Dialog.Content hideClose>
		<Dialog.Header>
			<Dialog.Title>Are you sure you want to delete {keyToDelete?.name}?</Dialog.Title>
			<Dialog.Description>
				This action cannot be undone. Any applications using this token will stop working.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteDialogOpen = false)}>Cancel</Button>
			<Button variant="destructive" onclick={deleteApiKey} loading={deletingKey}>Delete</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
