<script lang="ts">
	import * as Tabs from '$lib/components/site/tabs';
	import { toRelative } from '$lib/ts/dates.js';

	let { data, children } = $props();
</script>

<svelte:head>
	<title>@{data.scope.name} - Scopes - jsrepo</title>
</svelte:head>

<div class="flex flex-col gap-2 py-6">
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
