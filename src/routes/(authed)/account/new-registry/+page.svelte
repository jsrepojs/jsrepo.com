<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';
	import * as Select from '$lib/components/ui/select';
	import { queryParameters } from 'sveltekit-search-params';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Steps from '$lib/components/ui/steps';
	import { Code } from '$lib/components/ui/code/index.js';
	import { Snippet } from '$lib/components/ui/snippet';
	import { MetaTags } from '$lib/components/site/meta-tags/index.js';

	let { data } = $props();

	const params = queryParameters();

	let scope = $state(data.scopes.find((s) => s.name === $params.scope)?.name ?? '');
	let name = $state('');

	function emptyFallback(str: string, fallback: string) {
		if (str.trim().length === 0) {
			return fallback;
		}

		return str;
	}
</script>

<MetaTags title="New Registry - jsrepo"/>

<div class="flex flex-col gap-2">
	<a
		href="/account"
		class="flex place-items-center gap-2 py-2 text-muted-foreground transition-all hover:text-foreground"
	>
		<ChevronLeft />
		Back to Account
	</a>
	<h1 class="text-4xl font-bold">Publish a registry</h1>
	<Steps.Root>
		<Steps.Step title="Pick a Scope">
			<Select.Root type="single" bind:value={scope}>
				<Select.Trigger>
					{#if scope !== ''}
						<span>@{scope}</span>
					{:else}
						<span>Select a scope</span>
					{/if}
				</Select.Trigger>
				<Select.Content>
					{#each data.scopes as scope (scope.id)}
						<Select.Item value={scope.name}>
							@{scope.name}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			<span> or </span>
			<p>
				<a
					href="/account/scopes/new"
					class="w-fit font-medium text-foreground underline underline-offset-2"
				>
					Claim a New Scope
				</a>
			</p>
		</Steps.Step>
		<Steps.Step title="Choose a name for your registry">
			<Input bind:value={name} placeholder="std" />
		</Steps.Step>
		<Steps.Step title="Update your manifest">
			<Code
				lang="jsonc"
				code={`{
    "name": "@${emptyFallback(scope, '<scope>')}/${emptyFallback(name, '<name>')}",
    "version": "0.0.1",
    // ...
}`}
			/>
		</Steps.Step>
		<Steps.Step title="Authenticate to the jsrepo CLI">
			<Snippet text="jsrepo auth" />
		</Steps.Step>
		<Steps.Step title="Publish your registry">
			<Snippet text="jsrepo publish" />
		</Steps.Step>
	</Steps.Root>
</div>
