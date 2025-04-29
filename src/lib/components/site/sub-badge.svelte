<script lang="ts">
	import { checkUserSubscription } from '$lib/ts/stripe/client';
	import { Badge } from '$lib/components/ui/badge';
	import type { UserWithSubscription } from '$lib/backend/db/functions';

	type Props = {
		user: UserWithSubscription;
	};

	let { user }: Props = $props();

	const subscription = $derived(checkUserSubscription(user));
</script>

{#if subscription !== null}
	{#if subscription === 'pro'}
		<Badge class="border-0 bg-gradient-to-br from-yellow-500 to-red-500 text-white">Pro</Badge>
	{:else}
		<Badge class="border-0 bg-gradient-to-br from-blue-500 to-red-500 text-white">Team</Badge>
	{/if}
{/if}
