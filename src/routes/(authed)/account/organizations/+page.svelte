<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { checkUserSubscription } from '$lib/ts/stripe/client.js';
	import { Plus } from '@lucide/svelte';
	import * as List from '$lib/components/site/list';

	let { data } = $props();

	const subscription = $derived(checkUserSubscription(data.user));
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
			{#each data.organizations as organization (organization.org.id)}
				<List.Item>
					<List.Link href="/{organization.org.name}">
						{organization.org.name}
					</List.Link>
				</List.Item>
			{/each}
		</List.List>
	</List.Root>
</div>
