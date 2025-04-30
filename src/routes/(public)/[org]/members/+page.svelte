<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import * as List from '$lib/components/site/list';
	import { getInitials } from '$lib/ts/initials';
	import * as casing from '$lib/ts/casing';
	import { Crown, Ellipsis, X } from '@lucide/svelte';
	import Invite from './invite.svelte';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { Button } from '$lib/components/ui/button';
	import { UseQuery } from '$lib/hooks/use-query.svelte';
	import type { CancelInviteRequest } from '../../../api/orgs/[org]/members/invite/+server';
	import { invalidateAll } from '$app/navigation';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { toast } from 'svelte-sonner';
	import type { FullOrg } from '$lib/backend/db/functions';

	let { data } = $props();

	let tab = $state('members');

	const cancelInviteQuery = new UseQuery(async ({ setLoadingKey }, inviteId: number) => {
		setLoadingKey(inviteId.toString());

		const response = await fetch(`/api/orgs/${data.org.name}/members/invite`, {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ inviteId } satisfies CancelInviteRequest)
		});

		if (response.ok) {
			await invalidateAll();

			// go back to members tab if no invites are left
			if (data.invitations.length === 0) {
				tab = 'members';
			}
		}
	});

	const removeMemberQuery = new UseQuery(
		async ({ setLoadingKey }, member: FullOrg['members'][number]) => {
			setLoadingKey(member.id.toString());

			const response = await fetch(`/api/orgs/${data.org.name}/members/${member.id}`, {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' }
			});

			if (response.ok) {
				await invalidateAll();

				toast.success(`Removed ${member.user.name} from ${data.org.name}!`);
			} else {
				const err = await response.json();

				toast.error('Error removing member', { description: err.message });
			}
		}
	);
</script>

<svelte:head>
	<title>Members - {data.org.name} - Organizations - jsrepo</title>
</svelte:head>

<!-- we can only view the options if we are part of the org -->
{#if data.member}
	<div class="flex place-items-center justify-between pb-2">
		<div>
			<ToggleGroup.Root type="single" bind:value={tab}>
				<ToggleGroup.Item value="members">Members</ToggleGroup.Item>
				<ToggleGroup.Item value="invited">
					Invited
					{#if data.invitations.length > 0}
						<div
							class="flex size-[18px] shrink-0 place-items-center justify-center rounded-full bg-primary text-center font-mono text-xs text-primary-foreground"
						>
							<span>{data.invitations.length}</span>
						</div>
					{/if}
				</ToggleGroup.Item>
			</ToggleGroup.Root>
		</div>
		<div>
			<!-- only owners can invite users because of payment restrictions -->
			{#if data.member.role === 'owner'}
				<Invite org={data.org} />
			{/if}
		</div>
	</div>
{/if}
{#if tab === 'members'}
	<List.Root>
		<List.List>
			{#each data.org.members as member (member.id)}
				<List.Item class="hover:bg-card">
					<div class="flex place-items-center gap-4">
						<Avatar.Root class="size-9">
							<Avatar.Image src={member.user.image} />
							<Avatar.Fallback>{getInitials(member.user.name)}</Avatar.Fallback>
						</Avatar.Root>
						<div class="flex flex-col">
							<span class="font-medium">{member.user.name}</span>
							<span class="flex place-items-center gap-1.5 text-sm text-muted-foreground">
								{#if member.role === 'owner'}
									<Crown class="inline size-4" />
								{/if}
								{member.role}
							</span>
						</div>
					</div>
					{#if data.member?.role === 'owner'}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button {...props} variant="outline" size="sm">
										<Ellipsis />
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								<DropdownMenu.Group>
									<DropdownMenu.Item
										onSelect={() => removeMemberQuery.run(member)}
										disabled={member.role !== 'owner' ||
											data.org.members.filter((m) => m.id !== member.id && m.role === 'owner')
												.length === 0}
										class="text-destructive data-[highlighted]:text-destructive"
									>
										<X />
										Remove from org
									</DropdownMenu.Item>
								</DropdownMenu.Group>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					{/if}
				</List.Item>
			{/each}
		</List.List>
	</List.Root>
{:else if tab === 'invited' && data.member}
	{#if data.invitations.length === 0}
		<List.Empty>You haven't invited anyone.</List.Empty>
	{:else}
		<List.Root>
			<List.List>
				{#each data.invitations as invitation (invitation.id)}
					{@const role = casing.kebabToPascal(invitation.role)}
					<List.Item class="hover:bg-card">
						<div class="flex place-items-center gap-4">
							<Avatar.Root class="size-9">
								<Avatar.Image src={invitation.invitedUser.image} />
								<Avatar.Fallback>{getInitials(invitation.invitedUser.name)}</Avatar.Fallback>
							</Avatar.Root>
							<div class="flex flex-col">
								<span class="font-medium">{invitation.invitedUser.name}</span>
								<span class="flex place-items-center gap-1.5 text-sm text-muted-foreground">
									{role}
								</span>
							</div>
						</div>
						<div>
							<Button
								onclick={() => cancelInviteQuery.run(invitation.id)}
								disabled={cancelInviteQuery.loading}
								loading={cancelInviteQuery.loadingKey === invitation.id.toString()}
								variant="outline"
							>
								<X />
								Cancel
							</Button>
						</div>
					</List.Item>
				{/each}
			</List.List>
		</List.Root>
	{/if}
{/if}
