<script lang="ts">
	import * as Tabs from '$lib/components/site/tabs';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet<[]> } = $props();
</script>

<svelte:head>
	<title>@{data.scopeName}/{data.registryName} - jsrepo</title>
</svelte:head>

<div class="flex flex-col">
	<div class="flex flex-col gap-1 py-6">
		<h1 class="text-4xl font-bold">@{data.scopeName}/{data.registryName}</h1>
		<div class="relative flex place-items-center gap-2">
			<span class="font-mono text-sm text-muted-foreground">
				{data.version.version.version}
			</span>
		</div>
	</div>
	<Tabs.Root>
		<Tabs.Tab href="?tab=/" isSearch>README</Tabs.Tab>
		<Tabs.Tab href="?tab=blocks" isSearch>Blocks</Tabs.Tab>
		<Tabs.Tab href="?tab=dependencies" isSearch>Dependencies</Tabs.Tab>
		<Tabs.Tab href="?tab=versions" isSearch>Versions</Tabs.Tab>
	</Tabs.Root>
	<div class="w-full">
		{@render children()}
	</div>
</div>
