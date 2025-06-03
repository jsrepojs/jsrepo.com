<script lang="ts">
	import * as Nav from '$lib/components/site/nav';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Meter } from '$lib/components/ui/meter';
	import { ArrowUpRight, ChevronLeft, LogOut, Unplug } from '@lucide/svelte';
	import * as FieldSet from '$lib/components/ui/field-set';
	import { UsePromise } from '$lib/hooks/use-promise.svelte.js';
	import { signOut } from '$lib/auth/components/utils';
	import { UseQuery } from '$lib/hooks/use-query.svelte.js';
	import { MetaTags } from '$lib/components/site/meta-tags';

	let { data } = $props();

	const scopesPromise = new UsePromise(data.scopes, null);

	const connectAccountQuery = new UseQuery(async () => {
		const response = await fetch('/api/stripe/connect/account', {
			method: 'POST',
			headers: { 'content-type': 'applications/json' }
		});

		if (response.ok) {
			const res = await response.json();

			const { url } = res;

			if (url) {
				window.location.href = url;
			}
		} else {
			throw new Error('error creating account');
		}
	});

	const goToDashboardQuery = new UseQuery(async () => {
		const response = await fetch('/api/stripe/connect/account/login', {
			method: 'POST',
			headers: { 'content-type': 'applications/json' }
		});

		if (response.ok) {
			const res = await response.json();

			const { url } = res;

			if (url) {
				window.location.href = url;
			}
		} else {
			throw new Error('error getting express dashboard');
		}
	});
</script>

<MetaTags title="Settings - Account - jsrepo" />

<div class="flex flex-col gap-4">
	<a
		href="/account"
		class="text-muted-foreground hover:text-foreground flex place-items-center gap-2 py-2 transition-all"
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
		<FieldSet.Content class="flex flex-col gap-2">
			<FieldSet.Title>Your Usage</FieldSet.Title>
			<div class="flex flex-col gap-2">
				<div class="flex place-items-center justify-between">
					<Nav.Title>Scope Usage</Nav.Title>
					<span class="text-muted-foreground text-sm">
						{scopesPromise.current === null ? '...' : scopesPromise.current?.userScopes.length} /
						{data.user.scopeLimit}
					</span>
				</div>
				<Meter
					min={0}
					max={data.user.scopeLimit}
					value={scopesPromise.current?.userScopes.length ?? 0}
				/>
				<span class="text-muted-foreground text-xs">
					If you need more scopes reach out to support@jsrepo.com.
				</span>
			</div>
		</FieldSet.Content>
	</FieldSet.Root>
	{#if data.user.stripeSellerAccountId === null}
		<FieldSet.Root>
			<FieldSet.Content class="flex flex-row place-items-center justify-between gap-4">
				<div>
					<FieldSet.Title>Connect Seller Account</FieldSet.Title>
					<p class="text-muted-foreground">
						If you want to monetize your registries you'll need to connect your account.
					</p>
				</div>
				<Button
					class="shrink-0"
					onclick={connectAccountQuery.run}
					loading={connectAccountQuery.loading}
					variant="outline"
				>
					<Unplug />
					Connect Account
				</Button>
			</FieldSet.Content>
		</FieldSet.Root>
	{:else}
		<FieldSet.Root>
			<FieldSet.Content>
				<FieldSet.Title>Express Dashboard</FieldSet.Title>
				<FieldSet.Description
					>View your connect account on the Stripe dashboard.</FieldSet.Description
				>
			</FieldSet.Content>
			<FieldSet.Footer class="flex place-items-center justify-between gap-4">
				<div></div>
				<Button
					class="shrink-0"
					onclick={goToDashboardQuery.run}
					loading={goToDashboardQuery.loading}
					variant="outline"
				>
					<ArrowUpRight />
					Stripe Dashboard
				</Button>
			</FieldSet.Footer>
		</FieldSet.Root>
	{/if}
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
