<script lang="ts">
	import RegistrySearch from '$lib/components/site/registry-search.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Terminal } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Home - jsrepo</title>
</svelte:head>

<div class="flex place-items-center justify-center pb-4">
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
				<Terminal/>
				Start Shipping
			</Button>
		</div>
	</div>
	<div></div>
</div>
