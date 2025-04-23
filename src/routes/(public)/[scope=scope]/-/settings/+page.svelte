<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as FieldSet from '$lib/components/ui/field-set';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import { X, Check } from '@lucide/svelte';
	import { useDebounce } from 'runed';
	import type { TransferRequestResponse } from '../../../../api/scopes/[scope]/transfer/+server.js';

	let { data } = $props();

	let userOrOrgValidated = $state(false);
	let validUserOrOrg = $state(false);
	let userOrOrg = $state('');
	let transferring = $state(false);
	let transferDialogOpen = $state(false);

	async function searchUserOrOrg() {
		if (userOrOrg.trim().length === 0) {
			validUserOrOrg = false;
			return;
		}

		userOrOrgValidated = false;

		try {
			const response = await fetch(`/api/functions/user-or-org?search=${userOrOrg}`);

			validUserOrOrg = response.ok;
		} catch {
			validUserOrOrg = false;
		} finally {
			userOrOrgValidated = true;
		}
	}

	const searchUserOrOrgDB = useDebounce(searchUserOrOrg, 250);

	async function transfer() {
		transferring = true;

		try {
			const response = await fetch(`/api/scopes/@${data.scope.name}/transfer`, {
				method: 'PATCH',
				body: JSON.stringify({ transferTo: userOrOrg })
			});

			if (!response.ok) {
				return;
			}

			const result = (await response.json()) as TransferRequestResponse;

			if (result.type === 'requested') {
			} else {
			}

			userOrOrg = '';
			userOrOrgValidated = false;

			transferDialogOpen = false;
		} catch {
		} finally {
			transferring = false;
		}
	}
</script>

<!-- 
heres the plan here when a request is active this 
entire form will be replaced with the request where you can cancel it 
-->

<div class="flex flex-col gap-4">
	<FieldSet.Root>
		<FieldSet.Content class="flex flex-col gap-2">
			<FieldSet.Title>Transfer Ownership</FieldSet.Title>
			<div class="space-y-1">
				<Label>Email or Organization</Label>
				<div class="relative w-full max-w-sm">
					<Input
						placeholder="Users email or name of the organization"
						bind:value={userOrOrg}
						oninput={searchUserOrOrgDB}
					/>
					{#if userOrOrgValidated}
						{#if !validUserOrOrg && userOrOrg.length !== 0}
							<X class="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-destructive" />
						{:else if validUserOrOrg}
							<Check class="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-green-500" />
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
						<Button {...props} variant="destructive" disabled={userOrOrg.length === 0}>
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
							All registries belonging to this scope will be transferred to the new owner and you
							will no longer have access to this scope.
						</Dialog.Description>
					</Dialog.Header>
					<small class="text-muted-foreground">
						The user or organization owner will receive an email to accept the transfer. Submitting
						this form will dismiss any pending transfer requests.
					</small>
					<Dialog.Footer>
						<Button variant="outline" onclick={() => (transferDialogOpen = false)}>Cancel</Button>
						<Button variant="destructive" onclick={transfer} loading={transferring}>
							Transfer
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</FieldSet.Footer>
	</FieldSet.Root>
</div>
