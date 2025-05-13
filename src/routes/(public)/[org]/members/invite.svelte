<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Check, MailPlus, X } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { UseQuery } from '$lib/hooks/use-query.svelte';
	import { orgMemberRoles, type OrgRole } from '$lib/backend/db/schema';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as casing from '$lib/ts/casing';
	import { invalidateAll } from '$app/navigation';
	import type { InviteMemberRequest } from '../../../api/orgs/[org]/members/invite/+server';
	import type { FullOrg } from '$lib/backend/db/functions';

	type Props = {
		org: FullOrg;
	};

	let { org }: Props = $props();

	let open = $state(false);

	// form fields
	let username = $state('');
	let role = $state<OrgRole>('member');

	const inviteQuery = new UseQuery(async () => {
		const response = await fetch(`/api/orgs/${org.name}/members/invite`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify({ username, role } satisfies InviteMemberRequest)
		});

		if (!response.ok) {
			const error = await response.json();

			throw new Error(error.message);
		}

		await invalidateAll();
		open = false;
		username = '';
		role = 'member';
	});

	const validateUsernameQuery = new UseQuery(async () => {
		if (username.trim().length === 0) {
			return undefined;
		}

		const member = org.members.find((m) => m.user.username === username.trim());

		if (member) return false;

		const response = await fetch(`/api/orgs/${org.name}/members/can-invite?username=${username}`);

		if (!response.ok) {
			const error = await response.json();

			throw new Error(error.message);
		}

		return response.ok;
	});

	const canSubmit = $derived(validateUsernameQuery.data === true);
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button {...props}>
				<MailPlus />
				Invite
			</Button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Content hideClose>
		<Dialog.Header>
			<Dialog.Title>Invite New Member</Dialog.Title>
			<Dialog.Description>Let's make your team a little bit bigger.</Dialog.Description>
		</Dialog.Header>
		<div class="flex flex-col gap-2">
			<div>
				<Label>Username</Label>
				<div class="relative">
					<Input
						bind:value={username}
						oninput={validateUsernameQuery.runDB}
						placeholder="Username"
						aria-invalid={validateUsernameQuery.data === false}
						class="aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive"
					/>
					{#if validateUsernameQuery.data !== undefined}
						{#if validateUsernameQuery.data}
							<Check class="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-green-500" />
						{:else}
							<X class="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-destructive" />
						{/if}
					{/if}
				</div>
			</div>
			<div>
				<Label>Role</Label>
				<Select.Root type="single" bind:value={role}>
					<Select.Trigger>
						{casing.kebabToPascal(role)}
					</Select.Trigger>
					<Select.Content>
						{#each orgMemberRoles as r (r)}
							<Select.Item value={r} label={casing.kebabToPascal(r)} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>
		<Dialog.Footer class="flex !flex-row !place-items-center !justify-between">
			<small class="text-wrap text-start text-destructive">
				{#if inviteQuery.error}
					{inviteQuery.error}
				{:else if validateUsernameQuery.error}
					{validateUsernameQuery.error}
				{/if}
			</small>
			<div class="flex place-items-center gap-2">
				<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button onclick={inviteQuery.run} loading={inviteQuery.loading} disabled={!canSubmit}>
					Invite
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
