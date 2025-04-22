<script lang="ts">
	import * as Tabs from '$lib/components/site/tabs';

	let { data, children } = $props();
</script>

<svelte:head>
	<title>@{data.scope.name} - Scopes - jsrepo</title>
</svelte:head>

<div class="flex flex-col gap-2 py-8">
	<h1 class="text-4xl font-bold">@{data.scope.name}</h1>
	<Tabs.Root>
		<Tabs.Tab href="/@{data.scope.name}">Packages</Tabs.Tab>
		<Tabs.Tab href="/@{data.scope.name}/-/settings">Settings</Tabs.Tab>
	</Tabs.Root>
	<div class="w-full">
		{@render children()}
	</div>
</div>
