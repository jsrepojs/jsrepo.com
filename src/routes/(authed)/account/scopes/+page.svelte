<script lang="ts">
	import * as Nav from '$lib/components/site/nav';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Meter } from '$lib/components/ui/meter';
	import { activeSubscription } from '$lib/ts/polar/client.js';
	import { ChevronLeft, Plus } from '@lucide/svelte';

	let { data } = $props();

	const subscription = $derived(
		activeSubscription(data.user.polarSubscriptionPlanId, data.user.polarSubscriptionPlanEnd)
	);
</script>

<svelte:head>
	<title>Scopes - Account - jsrepo</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<a
		href="/account"
		class="flex place-items-center gap-2 text-muted-foreground transition-all hover:text-foreground"
	>
		<ChevronLeft />
		Back to Account
	</a>
	<div class="flex flex-col gap-2">
		{#if subscription === null}
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
		{/if}
	</div>
	<div class="flex flex-col gap-2">
		<div class="flex place-items-end justify-between">
			<Nav.Title>Your Scopes</Nav.Title>
			<Button
				href="/account/scopes/new"
				disabled={subscription === null && data.scopes.userScopes.length >= data.user.scopeLimit}
			>
				<Plus /> New
			</Button>
		</div>
		<ul class="flex flex-col gap-2">
			{#each data.scopes.userScopes as scope (scope.id)}
				<li
					class="relative flex place-items-center justify-between rounded-lg border bg-card p-4 transition-all hover:bg-accent"
				>
					<a href="/@{scope.name}" class="text-lg font-medium">
						<span class="absolute inset-0"></span>
						@{scope.name}
					</a>
				</li>
			{/each}
		</ul>
	</div>
	<div class="flex flex-col gap-2">
		<Nav.Title>Organization Scopes</Nav.Title>
		<ul class="flex flex-col gap-2">
			{#each data.scopes.orgScopes as scope (scope.scope.id)}
				<li
					class="relative flex place-items-center justify-between rounded-lg border bg-card p-4 transition-all hover:bg-accent"
				>
					<a href="/@{scope.scope.name}" class="text-lg font-medium">
						<span class="absolute inset-0"></span>
						@{scope.scope.name}
					</a>
				</li>
			{/each}
		</ul>
	</div>
</div>
