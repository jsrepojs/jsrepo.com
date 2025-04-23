<script lang="ts">
	import * as Nav from '$lib/components/site/nav';
	import { Button } from '$lib/components/ui/button/index.js';
	import { checkUserSubscription } from '$lib/ts/polar/client.js';
	import { ChevronLeft, Plus } from '@lucide/svelte';
	import * as List from '$lib/components/site/list';

	let { data } = $props();

	const subscription = $derived(checkUserSubscription(data.user));
	const ownedOrgs = $derived(data.organizations.filter((org) => org.org.ownerId === data.user.id));
	const memberOrgs = $derived(
		data.organizations.filter((org) => org.org_members?.userId === data.user.id)
	);
</script>

<svelte:head>
	<title>Organizations - Account - jsrepo</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<a
		href="/account"
		class="flex place-items-center gap-2 py-2 text-muted-foreground transition-all hover:text-foreground"
	>
		<ChevronLeft />
		Back to Account
	</a>
	<List.Root title="Your Organizations">
		{#snippet actions()}
			<Button href="/account/organizations/new" disabled={subscription !== 'Team'}>
				<Plus /> New
			</Button>
		{/snippet}
		<List.List>
			{#each ownedOrgs as organization (organization.org.id)}
				<List.Item>
					<List.Link href="/account/organizations/{organization.org.name}">
						{organization.org.name}
					</List.Link>
				</List.Item>
			{/each}
		</List.List>
	</List.Root>
	<List.Root title="Member Organizations">
		<List.List>
			{#each memberOrgs as organization (organization.org.id)}
				<List.Item>
					<List.Link href="/account/organizations/{organization.org.name}">
						{organization.org.name}
					</List.Link>
				</List.Item>
			{/each}
		</List.List>
	</List.Root>
</div>
