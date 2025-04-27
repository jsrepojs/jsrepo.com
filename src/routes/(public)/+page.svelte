<script lang="ts">
	import RegistrySearch from '$lib/components/site/registry-search.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ChevronRight, Lock, Milestone, Terminal } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Home - jsrepo</title>
</svelte:head>

<div class="flex flex-col place-items-center pb-4">
	<div class="mt-[25svh] flex w-full max-w-4xl flex-col place-items-center gap-8">
		<div class="flex flex-col gap-4">
			<h1 class="text-center text-5xl font-bold md:text-6xl">
				npm for your
				<br />
				<span
					class="inline-block bg-gradient-to-r from-primary to-red-400 bg-clip-text text-transparent"
				>
					Component Registries
				</span>
			</h1>
			<p class="text-center text-lg">
				jsrepo.com is a faster, simpler, more maintainable solution for hosting your component
				registries.
			</p>
		</div>
		<RegistrySearch maxOptions={3} />
		<div class="flex place-items-center gap-4">
			<Button href="/login">
				<span class="flex place-items-center">
					<ChevronRight class="inline" /> Start Shipping<span class="animate-caret-blink">_</span>
				</span>
			</Button>
		</div>
	</div>
	<div class="mb-20 mt-[25svh]">
		<h1 class="pb-6 text-center text-3xl font-bold">All the features you need</h1>
		<div class="grid bg-card md:grid-cols-3">
			<div
				class="rounded-tl-lg rounded-tr-lg border border-b-0 p-8 md:rounded-bl-lg md:rounded-tr-none md:border-b md:border-r-0"
			>
				<h4
					class="flex place-items-start gap-2 text-xl/[--line-height] font-medium"
					style="--line-height: 28px;"
				>
					<span class="flex h-[var(--line-height)] place-items-center justify-center">
						<Milestone class="inline size-5" />
					</span>
					Semantic Versioning
				</h4>
				<p class="text-muted-foreground">
					Manage versions of your registry using the semver standard.
				</p>
			</div>
			<div class="border border-b-0 p-8 md:border-b md:border-r-0">
				<h4
					class="flex place-items-start gap-2 text-xl/[--line-height] font-medium"
					style="--line-height: 28px;"
				>
					<span class="flex h-[var(--line-height)] place-items-center justify-center">
						<Lock class="inline size-5" />
					</span>
					Private Access
				</h4>
				<p class="text-muted-foreground">
					Keep your code private while still having access to all of jsrepo's features.
				</p>
			</div>
			<div class="rounded-bl-lg rounded-br-lg border p-8 md:rounded-bl-none md:rounded-tr-lg">
				<h4
					class="flex place-items-start gap-2 text-xl/[--line-height] font-medium"
					style="--line-height: 28px;"
				>
					<span class="flex h-[var(--line-height)] place-items-center justify-center">
						<Terminal class="inline size-5" />
					</span>
					First class CLI support
				</h4>
				<p class="text-muted-foreground">
					Publish, add, and update your blocks all from one place with the jsrepo CLI.
				</p>
			</div>
		</div>
	</div>
</div>
