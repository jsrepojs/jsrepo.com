<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { PRO_PRODUCT_ID, TEAM_PRODUCT_ID } from '$lib/ts/polar/client';
	import { Check } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Pricing - jsrepo</title>
</svelte:head>

<div class="grid w-full grid-cols-3 gap-2 py-8">
	<div class="col-start-1 my-4 flex flex-col gap-4 rounded-xl border border-border p-6">
		<div class="w-full text-center">
			<h4 class="text-center text-4xl font-bold">Free</h4>
			<span class="text-center text-xl font-medium"> $0 / month </span>
		</div>
		<Button href="/login">Get Started for Free</Button>
		{@render feature_list({
			features: ['Publish and install code from public registries', '5 registry scopes']
		})}
	</div>
	<div class="col-start-2 flex flex-col gap-4 rounded-xl border-2 border-primary p-6">
		<div class="w-full text-center">
			<h4 class="text-center text-4xl font-bold">Pro</h4>
			<span class="text-center text-xl font-medium"> $10 / month </span>
		</div>
		<Button href="/checkout?product={PRO_PRODUCT_ID}">Get Started</Button>
		{@render feature_list({
			features: ['Unlimited registry scopes', 'Publish and install code from private registries']
		})}
	</div>
	<div class="col-start-3 my-4 flex flex-col gap-4 rounded-xl border border-border p-6">
		<div class="w-full text-center">
			<h4 class="text-center text-4xl font-bold">Team</h4>
			<span class="text-center text-xl font-medium"> $25 / month </span>
		</div>
		<Button href="/checkout?product={TEAM_PRODUCT_ID}">Get Stared</Button>
		{@render feature_list({
			features: ['Everything in Pro plus...', 'Create and invite team members to organizations']
		})}
	</div>
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
