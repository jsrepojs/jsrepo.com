<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import * as List from '$lib/components/site/list';
	import { getInitials } from '$lib/ts/initials';
	import * as casing from '$lib/ts/casing';
	import { Crown } from '@lucide/svelte';
	import Invite from './invite.svelte';

	let { data } = $props();
</script>

<svelte:head>
    <title>Members - {data.org.name} - jsrepo</title>
</svelte:head>

<List.Root>
	{#snippet actions()}
		<!-- only owners can invite users because of payment restrictions -->
		{#if data.member && data.member.role === null}
			<Invite org={data.org}/>
		{/if}
	{/snippet}
	<List.List>
		{#each data.org.members as member (member.id)}
			{@const role = member.role ? casing.kebabToPascal(member.role) : 'Owner'}
			<List.Item class="">
				<div class="flex place-items-center gap-4">
					<Avatar.Root class="size-9">
						<Avatar.Image src={member.image} />
						<Avatar.Fallback>{getInitials(member.name)}</Avatar.Fallback>
					</Avatar.Root>
					<span>{member.name}</span>
				</div>
				<span class="flex place-items-center gap-1.5 text-muted-foreground">
					{#if role === 'Owner'}
						<Crown class="inline size-4" />
					{/if}
					{role}
				</span>
			</List.Item>
		{/each}
	</List.List>
</List.Root>
