<script lang="ts">
	import * as Nav from '$lib/components/site/nav';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Meter } from '$lib/components/ui/meter';
	import { ChevronLeft, LogOut, RefreshCcw, Unplug, X } from '@lucide/svelte';
	import * as FieldSet from '$lib/components/ui/field-set';
	import { UsePromise } from '$lib/hooks/use-promise.svelte.js';
	import { signOut } from '$lib/auth/components/utils';
	import SubBadge from '$lib/components/site/sub-badge.svelte';
	import { authClient } from '$lib/auth/client.js';
	import { toRelative } from '$lib/ts/dates.js';
	import { invalidateAll } from '$app/navigation';
	import { UseQuery } from '$lib/hooks/use-query.svelte.js';

	let { data } = $props();

	const scopesPromise = new UsePromise(data.scopes, null);

	const connectAccountQuery = new UseQuery(async () => {
		const response = await fetch('/api/stripe/connect/account', { method: 'POST' });

		console.log(response);

		if (response.ok) {
			const res = await response.json();

			console.log(res);

			const { url } = res;

			console.log(url);

			if (url) {
				window.location.href = url;
			}
		} else {
			throw new Error('error creating account');
		}
	});
</script>

<svelte:head>
	<title>Settings - Account - jsrepo</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<a
		href="/account"
		class="flex place-items-center gap-2 py-2 text-muted-foreground transition-all hover:text-foreground"
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
			<div class="flex flex-col gap-1">
				<FieldSet.Title>Your Subscription</FieldSet.Title>
				<p class="flex place-items-center gap-2 text-muted-foreground">
					<SubBadge user={data.user} />
					{#if data.user.subscription && data.user.subscription.cancelAtPeriodEnd && data.user.subscription?.periodEnd}
						<span class="text-sm text-muted-foreground">
							Ends {toRelative(data.user.subscription.periodEnd)}
						</span>
					{/if}
				</p>
			</div>
			{#if data.user.subscription !== null}
				{#if data.user.subscription.cancelAtPeriodEnd}
					<Button
						onClickPromise={async () => {
							await authClient.subscription.restore();

							await invalidateAll();
						}}
					>
						<RefreshCcw />
						Un-cancel
					</Button>
				{:else}
					<Button
						onClickPromise={() => authClient.subscription.cancel({ returnUrl: '/account' })}
						variant="outline"
					>
						<X />
						Cancel
					</Button>
				{/if}
			{:else}
				<Button href="/pricing">Get Pro</Button>
			{/if}
		</FieldSet.Content>
	</FieldSet.Root>
	{#if data.user.subscription === null}
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
	{#if data.user.stripeSellerAccountId === null}
		<FieldSet.Root>
			<FieldSet.Content class="flex flex-row place-items-center justify-between">
				<div>
					<FieldSet.Title>Connect Seller Account</FieldSet.Title>
					<p>If you want to monetize your registries you'll need to connect your account.</p>
				</div>
				<Button
					onclick={connectAccountQuery.run}
					loading={connectAccountQuery.loading}
					variant="outline"
				>
					<Unplug />
					Connect Account
				</Button>
			</FieldSet.Content>
		</FieldSet.Root>
	{/if}
	<!-- DO NOT LEAVE THIS IN -->
	<FieldSet.Root>
		<FieldSet.Content class="flex flex-row place-items-center justify-between">
			<FieldSet.Title>Purchase Temp!!!!!</FieldSet.Title>
			<Button
				onclick={async () => {
					const response = await fetch('/api/stripe/connect/registries/purchase', {
						method: 'POST'
					});

					if (!response.ok) {
						console.error(response);
					}

					const res = await response.json();

					const { url } = res;

					if (url) {
						window.location.href = url;
					}
				}}
				variant="outline"
			>
				Purchase
			</Button>
		</FieldSet.Content>
	</FieldSet.Root>
	<FieldSet.Root>
		<FieldSet.Content class="flex flex-row place-items-center justify-between">
			<FieldSet.Title>Sign Out</FieldSet.Title>
			<Button onclick={signOut} variant="outline">
				<LogOut />
				Sign Out
			</Button>
		</FieldSet.Content>
	</FieldSet.Root>
</div>
