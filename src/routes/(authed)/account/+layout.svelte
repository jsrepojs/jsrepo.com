<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { getInitials } from '$lib/ts/initials';
	import { toRelative } from '$lib/ts/dates.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { activeSubscription, PRO_PRODUCT_ID } from '$lib/ts/polar/client.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	let { data, children } = $props();

	const user = $derived(data.session.user);
	const joined = $derived(toRelative(user.createdAt));
	const subscription = $derived(
		activeSubscription(data.polarProductId, data.polarSubscriptionPlanEnd)
	);
</script>

<div class="flex h-svh flex-col gap-4 pt-10">
	<div class="grid grid-cols-1 place-items-start gap-4 md:grid-cols-[8rem_1fr] md:gap-8">
		<div
			class="col-start-1 flex flex-row place-items-center justify-start gap-2 md:flex-col md:justify-center"
		>
			<Avatar.Root class="size-24 md:size-32">
				<Avatar.Image src={user.image} />
				<Avatar.Fallback>{getInitials(user.name)}</Avatar.Fallback>
			</Avatar.Root>
			<div class="flex flex-col">
				<span class="max-w-full truncate text-start text-xl font-medium md:text-center">
					{user.name}
				</span>
				<span class="text-start text-muted-foreground md:text-center">Joined {joined}</span>
			</div>
			{#if subscription !== null}
				<Badge>{subscription}</Badge>
			{:else}
				<Button href="/api/checkout?products={PRO_PRODUCT_ID}&customerId={data.polarCustomerId}">
					Get Pro
				</Button>
			{/if}
		</div>
		<div class="w-full md:col-start-2">
			{@render children()}
		</div>
	</div>
</div>
