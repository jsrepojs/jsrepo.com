<script lang="ts">
	import * as Nav from '$lib/components/site/nav';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Meter } from '$lib/components/ui/meter';
	import { checkUserSubscription } from '$lib/ts/polar/client.js';
	import { Plus } from '@lucide/svelte';
	import * as List from '$lib/components/site/list';

	let { data } = $props();

	const subscription = $derived(checkUserSubscription(data.user));
</script>

<svelte:head>
	<title>Scopes - Account - jsrepo</title>
</svelte:head>

<div class="flex flex-col gap-4">
	{#if subscription === null}
		<div class="flex flex-col gap-2">
			<div class="flex place-items-center justify-between">
				<Nav.Title>Scope Usage</Nav.Title>
				<span class="text-sm text-muted-foreground">
					{data.scopes.userScopes.length} / {data.user.scopeLimit}
				</span>
			</div>
			<Meter min={0} max={data.user.scopeLimit} value={data.scopes.userScopes.length} />
			<span class="text-xs text-muted-foreground">
				Free users are limited to 5 scopes per account.
			</span>
		</div>
	{/if}
	<List.Root title="Your Scopes">
		{#snippet actions()}
			<Button
				href="/account/scopes/new"
				disabled={subscription === null && data.scopes.userScopes.length >= data.user.scopeLimit}
			>
				<Plus /> New
			</Button>
		{/snippet}
		<List.List>
			{#each data.scopes.userScopes as scope (scope.id)}
				<List.Scope {scope} />
			{/each}
		</List.List>
	</List.Root>
	<List.Root title="Organization Scopes">
		<List.List>
			{#each data.scopes.orgScopes as scope (scope.id)}
				<List.Scope {scope} />
			{/each}
		</List.List>
	</List.Root>
</div>
