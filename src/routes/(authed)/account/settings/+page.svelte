<script lang="ts">
	import * as Nav from '$lib/components/site/nav';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Meter } from '$lib/components/ui/meter';
	import { ChevronLeft, LogOut, Settings2 } from '@lucide/svelte';
	import * as FieldSet from '$lib/components/ui/field-set';
	import { checkUserSubscription } from '$lib/ts/stripe/client.js';
	import { UsePromise } from '$lib/hooks/use-promise.svelte.js';
	import { signOut } from '$lib/auth/components/utils';
	import SubBadge from '$lib/components/site/sub-badge.svelte';

	let { data } = $props();

	const subscription = $derived(checkUserSubscription(data.user));
	const scopesPromise = new UsePromise(data.scopes, null);
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
			<div>
				<FieldSet.Title>Your Subscription</FieldSet.Title>
				<p class="text-muted-foreground">
					<SubBadge user={data.user} />
				</p>
			</div>
			{#if subscription !== null}
				<Button href="/api/portal" variant="outline">
					<Settings2 />
					Manage
				</Button>
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
