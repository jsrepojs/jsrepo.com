<script lang="ts">
	import * as List from '$lib/components/site/list';
	import { Button } from '$lib/components/ui/button';
	import { UseQuery } from '$lib/hooks/use-query.svelte';
	import { Check, X } from '@lucide/svelte';
	import { invalidateAll } from '$app/navigation';
	import type { AcceptInviteRequest } from '../../../../api/orgs/[org]/members/invite/accept/+server.js';
	import type { RejectInviteRequest } from '../../../../api/orgs/[org]/members/invite/reject/+server.js';
	import * as casing from '$lib/ts/casing';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	type Action = 'accept' | 'reject';

	function getLoadingKey(id: number, action: Action) {
		return `${id}-${action}`;
	}

	const takeActionQuery = new UseQuery(
		async ({ setLoadingKey }, inviteId: number, orgName: string, action: Action) => {
			setLoadingKey(getLoadingKey(inviteId, action));

			if (action === 'reject') {
				const response = await fetch(`/api/orgs/${orgName}/members/invite/reject`, {
					method: 'PATCH',
					headers: {
						'content-type': 'application/json'
					},
					body: JSON.stringify({ inviteId } satisfies AcceptInviteRequest)
				});

				if (response.ok) {
					await invalidateAll();
				} else {
					const err = await response.json();

					toast.error('Error rejecting invitation', { description: err.message });
				}
			} else {
				const response = await fetch(`/api/orgs/${orgName}/members/invite/accept`, {
					method: 'PATCH',
					headers: {
						'content-type': 'application/json'
					},
					body: JSON.stringify({ inviteId } satisfies RejectInviteRequest)
				});

				if (response.ok) {
					await invalidateAll();

					toast.success(`Joined ${orgName}!`);
				} else {
					const err = await response.json();

					toast.error('Error accepting invitation', { description: err.message });
				}
			}
		}
	);
</script>

<svelte:head>
	<title>Invites - Organizations - Account - jsrepo</title>
</svelte:head>

{#if data.orgInvitesInbox.length === 0}
	<List.Empty>You have no organization invitations.</List.Empty>
{:else}
	<List.Root>
		<List.List>
			{#each data.orgInvitesInbox as invitation (invitation.id)}
				{@const role = casing.kebabToPascal(invitation.role)}
				<List.Item
					class="flex flex-col place-items-center gap-2 hover:bg-card sm:flex-row sm:justify-between"
				>
					<span>
						Join <span class="font-bold">{invitation.org.name}</span> as a {role}
					</span>
					<div class="flex place-items-center gap-2">
						<Button
							onclick={() => takeActionQuery.run(invitation.id, invitation.org.name, 'accept')}
							loading={takeActionQuery.loadingKey === getLoadingKey(invitation.id, 'accept')}
							disabled={takeActionQuery.loading}
						>
							<Check />
							Accept
						</Button>
						<Button
							onclick={() => takeActionQuery.run(invitation.id, invitation.org.name, 'reject')}
							loading={takeActionQuery.loadingKey === getLoadingKey(invitation.id, 'reject')}
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
