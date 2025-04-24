<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';
	import * as Tabs from '$lib/components/site/tabs';

	let { data, children } = $props();
</script>

<div class="flex flex-col gap-2">
	<a
		href="/account"
		class="flex place-items-center gap-2 py-2 text-muted-foreground transition-all hover:text-foreground"
	>
		<ChevronLeft />
		Back to Account
	</a>
	<Tabs.Root>
		<Tabs.Tab href="/account/scopes" activeForSubdirectories={false}>Scopes</Tabs.Tab>
		<Tabs.Tab
			href="/account/scopes/transfer-requests"
			tag={data.transferRequestInbox.length > 0 ? data.transferRequestInbox.length.toString() : undefined}
		>
			Transfer Requests
		</Tabs.Tab>
	</Tabs.Root>
	{@render children()}
</div>
