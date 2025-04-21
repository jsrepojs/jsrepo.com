<script lang="ts">
	import * as Nav from '$lib/components/site/nav';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Meter } from '$lib/components/ui/meter';
	import { ChevronLeft } from '@lucide/svelte';
	import * as FieldSet from '$lib/components/ui/field-set';
	import { activeSubscription } from '$lib/ts/polar/client.js';
	import { toRelative } from '$lib/ts/dates.js';
	import { UsePromise } from '$lib/hooks/use-promise.svelte.js';

	let { data } = $props();

	const subscription = $derived(
		activeSubscription(data.user.polarSubscriptionPlanId, data.user.polarSubscriptionPlanEnd)
	);
	const endsAt = $derived(
		data.user.polarSubscriptionPlanEnd ? toRelative(data.user.polarSubscriptionPlanEnd) : null
	);
	const scopesPromise = new UsePromise(data.scopes, null);
</script>

<svelte:head>
	<title>Settings - Account - jsrepo</title>
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
		<div class="flex place-items-center justify-between">
			<Nav.Title>Settings</Nav.Title>
		</div>
	</div>
	<FieldSet.Root>
		<FieldSet.Content class="flex flex-row place-items-center justify-between">
			<div>
				<FieldSet.Title>Your Subscription</FieldSet.Title>
				<p class="text-muted-foreground">
					{subscription ?? 'Free'}
					{endsAt ? `ends ${endsAt}` : ''}
				</p>
			</div>
			{#if subscription !== null}
				<Button href="/api/portal">Manage</Button>
			{:else}
				<Button href="/pricing">Upgrade</Button>
			{/if}
		</FieldSet.Content>
	</FieldSet.Root>
	{#if subscription === null}
		<FieldSet.Root>
			<FieldSet.Content class="flex flex-col gap-2">
				<FieldSet.Title>Your Usage</FieldSet.Title>
				<div class="flex flex-col gap-2">
					<div class="flex place-items-center justify-between">
						<Nav.Title>Scope Usage</Nav.Title>
						<span class="text-sm text-muted-foreground">
							{scopesPromise.current === null ? '...' : scopesPromise.current?.userScopes.length} /
							{data.user.scopeLimit}
						</span>
					</div>
					<Meter
						min={0}
						max={data.user.scopeLimit}
						value={scopesPromise.current?.userScopes.length ?? 0}
					/>
					<span class="text-xs text-muted-foreground">
						Free users are limited to 5 scopes per account to prevent abuse.
					</span>
				</div>
			</FieldSet.Content>
		</FieldSet.Root>
	{/if}
</div>
