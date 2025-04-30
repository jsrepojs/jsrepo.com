<script lang="ts">
	import * as FieldSet from '$lib/components/ui/field-set';
	import { Meter } from '$lib/components/ui/meter';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/state';
	import { YEAR } from '$lib/ts/time.js';
	import { Modal } from '$lib/components/ui/modal/index.js';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Counter } from '$lib/components/ui/counter/index.js';
	import { cn } from '$lib/utils/utils.js';
	import { UseQuery } from '$lib/hooks/use-query.svelte.js';
	import { invalidateAll } from '$app/navigation';
	import { authClient } from '$lib/auth/client.js';

	let { data } = $props();

	const occupiedSeats = $derived(data.org.members.length - 1);
	const subscriptionPeriod: 'annual' | 'monthly' | null = $derived(
		data.org.subscription
			? data.org.subscription.periodEnd!.valueOf() -
					data.org.subscription.periodStart!.valueOf() ===
				YEAR
				? 'annual'
				: 'monthly'
			: null
	);
	let seats = $derived(data.org.subscription?.seats ?? 0);
	const remainingSeats = $derived(Math.max(seats - occupiedSeats, 0));
	const monthlyCost = $derived(
		subscriptionPeriod === 'annual' ? ((seats * 100) / 12).toFixed(2) : seats * 10
	);

	let manageSeatsOpen = $state(false);
	let newSeats = $state(data.org.subscription?.seats ?? 0);

	const difference = $derived(newSeats - seats);

	const updateSeatsQuery = new UseQuery(async ({}) => {
		if (data.org.subscription === null) {
			const result = await authClient.subscription.upgrade({
				plan: 'Organization Seat',
				seats: newSeats,
				referenceId: data.org.id,
				successUrl: page.url.pathname,
				cancelUrl: page.url.pathname
			});

			if (result.error !== null) {
				throw new Error(result.error.message);
			} else {
				await invalidateAll();

				manageSeatsOpen = false;
			}
		} else {
			const response = await fetch(`/api/orgs/${data.org.name}/seats`, {
				method: 'PATCH',
				body: JSON.stringify({ seats: newSeats })
			});

			if (response.ok) {
				await invalidateAll();

				manageSeatsOpen = false;
				// we update the seats here because stripe webhooks haven't updated yet
				seats = newSeats;
			}
		}
	});

	const checkBearer = data.org.members.find(
		(m) => m.user.stripeCustomerId === data.org.subscription?.stripeCustomerId
	);
</script>

<svelte:head>
	<title>Settings - jsrepo - jsrepo</title>
</svelte:head>

<div class="flex flex-col gap-2">
	<FieldSet.Root class="relative">
		<FieldSet.Content class="flex flex-col gap-2">
			<FieldSet.Title>Seats</FieldSet.Title>
			{#if subscriptionPeriod}
				<div class="flex flex-col">
					<span class="text-sm">Cost Per Month</span>
					<span class="text-2xl font-medium">${monthlyCost}</span>
				</div>
			{/if}
			<div class="flex flex-col gap-2">
				<Meter min={0} max={seats} value={occupiedSeats} />
				<div class="flex place-items-center justify-between gap-4 text-sm">
					<span class="text-start text-muted-foreground">
						<span class="text-foreground">{occupiedSeats}</span> of
						<span class="text-foreground">{seats}</span>
						seats used
					</span>
					<span class="text-end text-muted-foreground">
						<span class="text-foreground">{remainingSeats}</span>
						{remainingSeats === 1 ? 'seat' : 'seats'} remaining.
					</span>
				</div>
			</div>
		</FieldSet.Content>
		<FieldSet.Footer class="flex place-items-center justify-between">
			<span class="text-sm text-muted-foreground">
				You can manage your organizations seats here.
			</span>
			<Button
				disabled={data.member.role !== 'owner' ||
					(checkBearer !== undefined && checkBearer.userId !== data.user.id)}
				onclick={() => (manageSeatsOpen = true)}
			>
				Manage
			</Button>
		</FieldSet.Footer>
		{#if data.org.subscription === null && data.user?.subscription === null}
			<div
				class="absolute left-0 top-0 z-[1] flex size-full place-items-center justify-center rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
			>
				<span class="text-center text-lg">
					You need a Pro subscription before you can manage an organization.
				</span>
			</div>
		{/if}
	</FieldSet.Root>
</div>

<Modal bind:open={manageSeatsOpen} class="md:max-w-md">
	<div class="flex flex-col p-6 md:p-0">
		<Dialog.Header>
			<Dialog.Title>Manage Organization Seats</Dialog.Title>
			<Dialog.Description>
				Add or remove seats for your organization. You cannot reduce seats below your current usage
				({occupiedSeats}
				seats).
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex place-items-center justify-center py-6">
			<Counter bind:value={newSeats} min={occupiedSeats} label="Total Seats" />
		</div>
		<div class="flex flex-col gap-2">
			<div class="flex place-items-center justify-between text-sm">
				<span class="text-muted-foreground">Cost per seat:</span>
				<span>$10.00/month</span>
			</div>
			<div class="flex place-items-center justify-between text-lg">
				<span class="">New Monthly Cost:</span>
				<span>${(newSeats * 10).toFixed(2)}/month</span>
			</div>
			<div class="h-6">
				{#if difference !== 0}
					{#if newSeats > seats}
						<div class="flex place-items-center justify-between text-green-500">
							<span class="">Difference:</span>
							<span>
								+{Math.abs(difference)} seat(s) ${((newSeats - seats) * 10).toFixed(2)}/month
							</span>
						</div>
					{:else}
						<div class="flex place-items-center justify-between text-red-500">
							<span class="">Difference:</span>
							<span>
								-{Math.abs(difference)} seat(s) ${(newSeats * 10).toFixed(2)}/month
							</span>
						</div>
					{/if}
				{/if}
			</div>
		</div>
		<div class="flex w-full place-items-center justify-between py-6">
			<Button onclick={() => (manageSeatsOpen = false)} variant="outline">Cancel</Button>
			<Button
				disabled={difference === 0}
				onclick={() => updateSeatsQuery.run()}
				loading={updateSeatsQuery.loading}
				class={cn('bg-red-500 text-white hover:bg-red-500/90', {
					'bg-green-500 hover:bg-green-500/90': difference >= 0
				})}
			>
				{#if difference === 0}
					No Changes
				{:else if difference > 0}
					Add {Math.abs(difference)} seat(s)
				{:else}
					Remove {Math.abs(difference)} seat(s)
				{/if}
			</Button>
		</div>
	</div>
</Modal>
