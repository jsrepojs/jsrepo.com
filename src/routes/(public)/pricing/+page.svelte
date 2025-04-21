<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { PRO_PRODUCT_ID, TEAM_PRODUCT_ID } from '$lib/ts/polar/client';
	import { Check } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Pricing - jsrepo</title>
</svelte:head>

<div class="min-h-[calc(100svh-var(--header-height))] py-[--header-height] flex flex-col place-items-center justify-center">
	<h1 class="text-6xl font-bold">Pricing</h1>
	<div class="grid w-fit max-w-4xl grid-cols-1 place-items-center gap-2 py-8 md:grid-cols-3">
		<div
			class="flex w-full h-full max-w-sm flex-col gap-4 rounded-xl border border-border p-6 md:col-start-1"
		>
			<div class="w-full text-center">
				<h4 class="text-center text-4xl font-bold">Free</h4>
				<span class="text-center text-2xl font-medium"> $0 / month </span>
			</div>
			<Button href="/login">Get Started for Free</Button>
			{@render feature_list({
				features: ['Publish and install code from public registries', '5 registry scopes']
			})}
		</div>
		<div
			class="flex w-full h-full max-w-sm flex-col gap-4 rounded-xl border-2 border-primary p-6 md:col-start-2"
		>
			<div class="w-full text-center">
				<h4 class="text-center text-4xl font-bold">Pro</h4>
				<span class="text-center text-2xl font-medium"> $10 / month </span>
			</div>
			<Button href="/checkout?product={PRO_PRODUCT_ID}">Get Started</Button>
			{@render feature_list({
				features: ['Unlimited registry scopes', 'Publish and install code from private registries']
			})}
		</div>
		<div
			class="flex w-full h-full max-w-sm flex-col gap-4 rounded-xl border border-border p-6 md:col-start-3"
		>
			<div class="w-full text-center">
				<h4 class="text-center text-4xl font-bold">Team</h4>
				<span class="text-center text-2xl font-medium"> $25 / month* </span>
			</div>
			<Button href="/checkout?product={TEAM_PRODUCT_ID}">Get Stared</Button>
			{@render feature_list({
				features: [
					'Unlimited registry scopes',
					'Publish and install code from private registries',
					'Create and invite team members to organizations'
				]
			})}
		</div>
	</div>
	<span class="text-sm text-muted-foreground">
		*As we are still getting started expect pricing to change.
	</span>
</div>

{#snippet feature_list({ features }: { features: string[] })}
	<ul class="flex flex-col gap-2 text-sm text-muted-foreground">
		{#each features as feature (feature)}
			<li class="flex place-items-start gap-2 text-sm/[--line-height]" style="--line-height: 20px;">
				<span class="flex h-[var(--line-height)] place-items-center justify-center">
					<Check class="size-3 text-green-400" />
				</span>
				{feature}
			</li>
		{/each}
	</ul>
{/snippet}
