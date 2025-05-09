<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as FieldSet from '$lib/components/ui/field-set';
	import * as Select from '$lib/components/ui/select';
	import { UseQuery } from '$lib/hooks/use-query.svelte';
	import type { UpdateRegistryAccessRequest } from '../../../../routes/api/scopes/[scope=scope]/[name]/access/+server';
	import type { RegistryViewPageData } from './types';
	import * as casing from '$lib/ts/casing';
	import * as Avatar from '$lib/components/ui/avatar';
	import { getInitials } from '$lib/ts/initials';
	import { Unplug, Wrench, X } from '@lucide/svelte';
	import type { LinkAccountToRegistryRequest } from '../../../../routes/api/stripe/connect/registries/link/+server';
	import type { UnlinkAccountFromRegistryRequest } from '../../../../routes/api/stripe/connect/registries/unlink/+server';

	let { data }: { data: RegistryViewPageData } = $props();

	let access = $derived(data.registry.access);

	const updateAccessQuery = new UseQuery(async () => {
		const response = await fetch(`/api/scopes/@${data.scopeName}/${data.registryName}/access`, {
			method: 'PATCH',
			headers: { 'content-type': 'applications/json' },
			body: JSON.stringify({ access } satisfies UpdateRegistryAccessRequest)
		});

		if (response.ok) {
			await invalidateAll();
		}
	});

	const connectAccountQuery = new UseQuery(async () => {
		const response = await fetch('/api/stripe/connect/registries/link', {
			method: 'PATCH',
			headers: { 'content-type': 'applications/json' },
			body: JSON.stringify({ registryId: data.registry.id } satisfies LinkAccountToRegistryRequest)
		});

		if (response.ok) {
			await invalidateAll();
		}
	});

	const unlinkAccountQuery = new UseQuery(async () => {
		const response = await fetch('/api/stripe/connect/registries/unlink', {
			method: 'PATCH',
			headers: { 'content-type': 'applications/json' },
			body: JSON.stringify({
				registryId: data.registry.id
			} satisfies UnlinkAccountFromRegistryRequest)
		});

		if (response.ok) {
			await invalidateAll();
		}
	});
</script>

<div class="flex flex-col gap-2 py-2">
	{#if data.registry.connectedStripeAccount !== null}
		<FieldSet.Root>
			<FieldSet.Content class="flex place-items-center justify-between">
				<div class="flex flex-col gap-1">
					<FieldSet.Title>Connected Account</FieldSet.Title>
					<a
						href="/users/{data.registry.connectedStripeAccount?.username}"
						class="group flex place-items-center gap-2"
					>
						<Avatar.Root class="size-5">
							<Avatar.Image src={data.registry.connectedStripeAccount?.image} />
							<Avatar.Fallback>
								{getInitials(data.registry.connectedStripeAccount?.name ?? '')}
							</Avatar.Fallback>
						</Avatar.Root>
						<span class="text-muted-foreground transition-all group-hover:text-foreground">
							{data.registry.connectedStripeAccount?.username}
						</span>
					</a>
				</div>
				<Button
					onclick={unlinkAccountQuery.run}
					loading={unlinkAccountQuery.loading}
					variant="outline"
				>
					<X />
					Unlink Account
				</Button>
			</FieldSet.Content>
		</FieldSet.Root>
	{:else}
		<FieldSet.Root>
			<FieldSet.Content class="flex place-items-center justify-between">
				<div>
					<FieldSet.Title>Connect Your Stripe Account</FieldSet.Title>
					<p class="text-muted-foreground">
						Connect your Stripe account to start receiving payments.
					</p>
				</div>
				{#if data.user?.stripeSellerAccountId !== null}
					<Button
						onclick={connectAccountQuery.run}
						loading={connectAccountQuery.loading}
						variant="outline"
					>
						<Unplug />
						Connect Account
					</Button>
				{:else}
					<Button href="/account/settings" variant="outline">
						<Wrench />
						Setup Stripe
					</Button>
				{/if}
			</FieldSet.Content>
		</FieldSet.Root>
	{/if}
	<FieldSet.Root variant="destructive">
		<FieldSet.Content class="flex flex-col gap-2">
			<FieldSet.Title>Access</FieldSet.Title>
			<Select.Root type="single" bind:value={access}>
				<Select.Trigger class="max-w-36">
					{casing.camelToPascal(access)}
				</Select.Trigger>
				<Select.Content align="start">
					<Select.Item value="public">Public</Select.Item>
					<Select.Item value="private">Private</Select.Item>
					<Select.Item value="marketplace">Marketplace</Select.Item>
				</Select.Content>
			</Select.Root>
		</FieldSet.Content>
		<FieldSet.Footer>
			<div class="flex place-items-center justify-between gap-4">
				<div>
					<span class="hidden truncate text-sm text-muted-foreground md:block">
						This determines who can view your registry and add components from the CLI.
					</span>
				</div>
				<Button
					variant="destructive"
					class="shrink-0"
					onclick={updateAccessQuery.run}
					loading={updateAccessQuery.loading}
					disabled={access === data.registry.access}
				>
					Update Access
				</Button>
			</div>
		</FieldSet.Footer>
	</FieldSet.Root>
</div>
