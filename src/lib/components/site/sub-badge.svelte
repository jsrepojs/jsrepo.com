<script lang="ts">
	import type { User } from '$lib/backend/db/schema';
	import { checkUserSubscription } from '$lib/ts/polar/client';
	import { Badge } from '$lib/components/ui/badge';

	type Props = {
		user: User;
	};

	let { user }: Props = $props();

	const subscription = $derived(checkUserSubscription(user));
</script>

{#if subscription !== null}
	{#if subscription === 'Pro'}
		<Badge class="border-0 bg-gradient-to-br from-yellow-500 to-red-500 text-white">
			{subscription}
		</Badge>
	{:else}
		<Badge class="border-0 bg-gradient-to-br from-blue-500 to-red-500 text-white">
			{subscription}
		</Badge>
	{/if}
{/if}
