<script lang="ts">
	import * as List from '$lib/components/site/list';
	import { Button } from '$lib/components/ui/button';
	import { UseQuery } from '$lib/hooks/use-query.svelte';
	import { Check, X } from '@lucide/svelte';
	import type { RejectTransferRequest } from '../../../../api/scopes/[scope=scope]/transfer/reject/+server.js';
	import { invalidateAll } from '$app/navigation';
	import type { AcceptTransferRequest } from '../../../../api/scopes/[scope=scope]/transfer/accept/+server.js';

	let { data } = $props();

	function transferToWho(request: (typeof data.transferRequestInbox)[number]) {
		if (request.scope_transfer_request.newOrgId) {
			return request.org?.name;
		} else {
			return 'you';
		}
	}

	type Action = 'accept' | 'reject';

	function getLoadingKey(id: number, action: Action) {
		return `${id}-${action}`;
	}

	const takeActionQuery = new UseQuery(
		async ({ setLoadingKey }, id: number, scopeName: string, action: Action) => {
			setLoadingKey(getLoadingKey(id, action));

			if (action === 'reject') {
				const response = await fetch(`/api/scopes/@${scopeName}/transfer/reject`, {
					method: 'PATCH',
					headers: {
						'content-type': 'application/json'
					},
					body: JSON.stringify({ requestId: id } satisfies RejectTransferRequest)
				});

				if (response.ok) {
					await invalidateAll();
				}
			} else {
				const response = await fetch(`/api/scopes/@${scopeName}/transfer/accept`, {
					method: 'PATCH',
					headers: {
						'content-type': 'application/json'
					},
					body: JSON.stringify({ requestId: id } satisfies AcceptTransferRequest)
				});

				if (response.ok) {
					await invalidateAll();
				}
			}
		}
	);
</script>

<svelte:head>
	<title>Transfer Requests - Scopes - Account - jsrepo</title>
</svelte:head>

{#if data.transferRequestInbox.length === 0}
	<div class="flex h-96 flex-col place-items-center justify-center gap-2">
		<span class="text-center text-lg text-muted-foreground">
			You have no pending scope transfer requests.
		</span>
	</div>
{:else}
	<List.Root>
		<List.List>
			{#each data.transferRequestInbox as transferRequest (transferRequest.scope_transfer_request.id)}
				{@const newOwner = transferToWho(transferRequest)}
				<List.Item
					class="flex flex-col place-items-center gap-2 hover:bg-card sm:flex-row sm:justify-between"
				>
					<span>
						Transfer
						<span class="font-semibold">@{transferRequest.scope.name}</span> to {newOwner}
					</span>
					<div class="flex place-items-center gap-2">
						<Button
							onclick={() =>
								takeActionQuery.run(
									transferRequest.scope_transfer_request.id,
									transferRequest.scope.name,
									'accept'
								)}
							loading={takeActionQuery.loadingKey ===
								getLoadingKey(transferRequest.scope_transfer_request.id, 'accept')}
							disabled={takeActionQuery.loading}
						>
							<Check />
							Accept
						</Button>
						<Button
							onclick={() =>
								takeActionQuery.run(
									transferRequest.scope_transfer_request.id,
									transferRequest.scope.name,
									'reject'
								)}
							loading={takeActionQuery.loadingKey ===
								getLoadingKey(transferRequest.scope_transfer_request.id, 'reject')}
							disabled={takeActionQuery.loading}
							variant="outline"
						>
							<X />
							Reject
						</Button>
					</div>
				</List.Item>
			{/each}
		</List.List>
	</List.Root>
{/if}
