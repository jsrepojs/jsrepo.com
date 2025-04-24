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
		<Tabs.Tab href="/account/organizations" activeForSubdirectories={false}>Organizations</Tabs.Tab>
		<Tabs.Tab
			href="/account/organizations/invites"
			tag={data.orgInvitesInbox.length > 0 ? data.orgInvitesInbox.length.toString() : undefined}
		>
			Invitations
		</Tabs.Tab>
	</Tabs.Root>
	{@render children()}
</div>
