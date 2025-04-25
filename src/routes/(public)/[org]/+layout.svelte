<script lang="ts">
	import * as Tabs from '$lib/components/site/tabs';

	let { data, children } = $props();
</script>

<div class="flex flex-col py-6">
	<div class="flex flex-col gap-2">
		<div class="flex flex-col gap-1">
			<h1 class="text-4xl font-bold">{data.org.name}</h1>
			{#if data.org.description}
				<p class="text-muted-foreground">{data.org.description}</p>
			{/if}
		</div>
		<Tabs.Root>
			<Tabs.Tab href="/{data.org.name}" activeForSubdirectories={false}>Home</Tabs.Tab>
			<Tabs.Tab href="/{data.org.name}/registries">Registries</Tabs.Tab>
			<Tabs.Tab href="/{data.org.name}/scopes">Scopes</Tabs.Tab>
			<Tabs.Tab href="/{data.org.name}/members" tag={data.org.members.length.toString()}>
				Members
			</Tabs.Tab>
			{#if data.member}
				<Tabs.Tab href="/{data.org.name}/settings">Settings</Tabs.Tab>
			{/if}
		</Tabs.Root>
	</div>
	<div class="w-full">
		{@render children()}
	</div>
</div>
