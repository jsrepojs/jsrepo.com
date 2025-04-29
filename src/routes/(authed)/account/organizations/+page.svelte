<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { checkUserSubscription } from '$lib/ts/stripe/client.js';
	import { Plus } from '@lucide/svelte';
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
	<List.Root title="Your Organizations">
		{#snippet actions()}
			<Button href="/account/organizations/new" disabled={subscription === null}>
				<Plus /> New
			</Button>
		{/snippet}
		<List.List>
			{#each ownedOrgs as organization (organization.org.id)}
				<List.Item>
					<List.Link href="/{organization.org.name}">
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
					<List.Link href="/{organization.org.name}">
						{organization.org.name}
					</List.Link>
				</List.Item>
			{/each}
		</List.List>
	</List.Root>
</div>
