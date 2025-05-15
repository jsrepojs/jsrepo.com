<script lang="ts">
	import * as Tabs from '$lib/components/site/tabs';
	import { toRelative } from '$lib/ts/dates.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { MetaTags } from '$lib/components/site/meta-tags';

	let { data, children } = $props();
</script>

<MetaTags title="@{data.scope.name} - Scopes - jsrepo" />

<div class="flex flex-col gap-2 py-6">
	<Breadcrumb.Root>
		<Breadcrumb.List>
			<Breadcrumb.Item>Scopes</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Page>@{data.scope.name}</Breadcrumb.Page>
		</Breadcrumb.List>
	</Breadcrumb.Root>
	<div class="flex flex-col gap-1">
		<h1 class="text-4xl font-bold">@{data.scope.name}</h1>
		<span class="text-sm text-muted-foreground">Claimed {toRelative(data.scope.claimedAt)}</span>
	</div>
	<Tabs.Root>
		<Tabs.Tab href="/@{data.scope.name}" activeForSubdirectories={false}>Registries</Tabs.Tab>
		{#if data.hasSettingsAccess}
			<Tabs.Tab href="/@{data.scope.name}/-/settings">Settings</Tabs.Tab>
		{/if}
	</Tabs.Root>
	<div class="w-full">
		{@render children()}
	</div>
</div>
