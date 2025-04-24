<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as FieldSet from '$lib/components/ui/field-set';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import { X, Check } from '@lucide/svelte';
	import type { TransferRequestResponse } from '../../../../api/scopes/[scope=scope]/transfer/+server.js';
	import { authClient } from '$lib/auth/client.js';
	import { UseQuery } from '$lib/hooks/use-query.svelte.js';
	import { getOwnerName, isSameScopeOwner } from '$lib/backend/db/client-functions.js';
	import { goto, invalidateAll } from '$app/navigation';
	import type { CancelTransferRequestRequest } from '../../../../api/scopes/[scope=scope]/transfer/cancel/+server.js';
	import { toRelative } from '$lib/ts/dates.js';

	let { data } = $props();

	const session = authClient.useSession();

	let userOrOrg = $state('');

	let transferDialogOpen = $state(false);
	let activeTransferRequest = $derived(data.activeTransferRequest);

	const searchUserOrOrgQuery = new UseQuery(
		async ({ signal }) => {
			if (userOrOrg.trim().length === 0) {
				return undefined;
			}

			if (
				isSameScopeOwner(userOrOrg, { scope: data.scope, user: data.owner, org: data.ownerOrg })
			) {
				return false;
			}

			const response = await fetch(`/api/functions/user-or-org?search=${userOrOrg}`, { signal });

			return response.ok;
		},
		{ invalidateOnCall: true }
	);

	const transferQuery = new UseQuery(async () => {
		const response = await fetch(`/api/scopes/@${data.scope.name}/transfer`, {
			method: 'POST',
			body: JSON.stringify({ transferTo: userOrOrg })
		});

		if (!response.ok) {
			throw new Error(`${response.status} ${response.statusText}`);
		}

		const result = (await response.json()) as TransferRequestResponse;

		if (result.type === 'requested') {
			await invalidateAll();
		} else {
			await goto(`/@${data.scope.name}`);
		}

		userOrOrg = '';
		searchUserOrOrgQuery.data = undefined;

		transferDialogOpen = false;
	});

	const cancelTransferRequestQuery = new UseQuery(async () => {
		if (activeTransferRequest === null) return;

		const response = await fetch(`/api/scopes/@${data.scope.name}/transfer/cancel`, {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				requestId: activeTransferRequest.scopeTransferRequest.id
			} satisfies CancelTransferRequestRequest)
		});

		if (!response.ok) {
			throw new Error(`${response.status} ${response.statusText}`);
		}

		await invalidateAll();
	});

	const ownerName = $derived(
		getOwnerName({ scope: data.scope, user: data.owner, org: data.ownerOrg })
	);
</script>

<div class="flex flex-col gap-4">
	<FieldSet.Root>
		<FieldSet.Content>
			<FieldSet.Title>Owned by {ownerName}</FieldSet.Title>
			<small class="text-muted-foreground">Claimed {toRelative(data.scope.claimedAt)}</small>
		</FieldSet.Content>
	</FieldSet.Root>
	{#if data.owner.id === $session.data?.user.id}
		{#if activeTransferRequest}
			<FieldSet.Root variant="destructive">
				<FieldSet.Content>
					<FieldSet.Title>Transfer Requested</FieldSet.Title>
					<p class="text-muted-foreground">
						You have requested to transfer ownership of this scope to {activeTransferRequest
							.scopeTransferRequest.newOrgId
							? activeTransferRequest.toOrg?.name
							: activeTransferRequest.toUser?.name}
					</p>
				</FieldSet.Content>
				<FieldSet.Footer class="flex place-items-center justify-between">
					<small class="hidden text-muted-foreground md:block">
						If this was a mistake or you changed your mind you can cancel here.
					</small>
					<Button
						variant="destructive"
						onclick={cancelTransferRequestQuery.run}
						loading={cancelTransferRequestQuery.loading}
					>
						Cancel
					</Button>
				</FieldSet.Footer>
			</FieldSet.Root>
		{:else}
			<FieldSet.Root variant="destructive">
				<FieldSet.Content class="flex flex-col gap-2">
					<FieldSet.Title>Transfer Ownership</FieldSet.Title>
					<div class="space-y-1">
						<Label>Email or Organization</Label>
						<div class="relative w-full max-w-sm">
							<Input
								placeholder="Users email or name of the organization"
								bind:value={userOrOrg}
								oninput={searchUserOrOrgQuery.runDB}
							/>
							{#if searchUserOrOrgQuery.data !== undefined}
								{#if searchUserOrOrgQuery.data}
									<Check class="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-green-500" />
								{:else}
									<X class="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-destructive" />
								{/if}
							{/if}
						</div>
					</div>
				</FieldSet.Content>
				<FieldSet.Footer class="flex place-items-center justify-between gap-4">
					<span class="text-sm text-muted-foreground">
						<span class="hidden sm:block">Transfer the scope and all it's registries.</span>
					</span>
					<Dialog.Root bind:open={transferDialogOpen}>
						<Dialog.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="destructive" disabled={!searchUserOrOrgQuery.data}>
									Transfer
								</Button>
							{/snippet}
						</Dialog.Trigger>
						<Dialog.Content hideClose class="flex flex-col gap-4">
							<Dialog.Header>
								<Dialog.Title>
									Are you sure you want to transfer ownership of @{data.scope.name}?
								</Dialog.Title>
								<Dialog.Description>
									All registries belonging to this scope will be transferred to the new owner and
									you will no longer have access to this scope.
								</Dialog.Description>
							</Dialog.Header>
							<small class="text-muted-foreground">
								The user or organization owner will receive an email to accept the transfer.
								Submitting this form will dismiss any pending transfer requests.
							</small>
							<Dialog.Footer>
								<Button variant="outline" onclick={() => (transferDialogOpen = false)}>
									Cancel
								</Button>
								<Button
									variant="destructive"
									onclick={transferQuery.run}
									loading={transferQuery.loading}
								>
									Transfer
								</Button>
							</Dialog.Footer>
						</Dialog.Content>
					</Dialog.Root>
				</FieldSet.Footer>
			</FieldSet.Root>
		{/if}
	{/if}
</div>
