<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Check } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Pricing - jsrepo</title>
</svelte:head>

<div class="flex flex-col place-items-center justify-center py-[--header-height]">
	<h1 class="text-6xl font-bold">Pricing</h1>
	<div class="grid w-fit max-w-6xl grid-cols-1 place-items-center gap-4 py-8 lg:grid-cols-3">
		<div
			class="flex h-full w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card/50 p-6 lg:col-start-1 lg:h-[450px]"
		>
			<div class="w-full text-center">
				<h4 class="text-center text-4xl font-bold">Free</h4>
				<span class="text-center text-2xl font-medium"> $0 / month </span>
			</div>
			<Button href="/login" variant="outline">Get Started for Free</Button>
			{@render feature_list({
				features: ['Publish and install code from public registries', '5 registry scopes']
			})}
		</div>
		<div
			class="flex h-full w-full max-w-sm flex-col gap-4 rounded-xl border-2 border-primary bg-gradient-to-br from-card p-6 lg:col-start-2 lg:h-[450px]"
		>
			<div class="w-full text-center">
				<h4 class="text-center text-4xl font-bold">Pro</h4>
				<span class="text-center text-2xl font-medium"> $10 / month </span>
			</div>
			<Button href="/checkout/pro">Get Started</Button>
			{@render feature_list({
				features: ['Unlimited registry scopes', 'Publish and install code from private registries']
			})}
		</div>
		<div
			class="flex h-full w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card/50 p-6 lg:col-start-3 lg:h-[450px]"
		>
			<div class="w-full text-center">
				<h4 class="text-center text-4xl font-bold">Team</h4>
				<span class="text-center text-2xl font-medium"> $25 / month* </span>
			</div>
			<Button href="/checkout/team" variant="outline">Get Stared</Button>
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
		*Pricing may change as we are still just getting started.
	</span>
	<div class="mt-20 flex flex-col place-items-center justify-center gap-2">
		<h2 class="text-center text-3xl font-bold">Can't decide?</h2>
		<p class="text-muted-foreground">
			Were here to help! Shoot us an email and let's talk about it!
		</p>
		<Button href="/help?reason=pricing" variant="outline">Contact Us</Button>
	</div>
</div>

{#snippet feature_list({ features }: { features: string[] })}
	<ul class="flex flex-col gap-2 text-sm text-muted-foreground">
		{#each features as feature (feature)}
			<li class="flex place-items-start gap-2 text-sm/[--line-height]" style="--line-height: 20px;">
				<span class="flex h-[var(--line-height)] place-items-center justify-center">
					<Check class="size-4 text-green-400" />
				</span>
				{feature}
			</li>
		{/each}
	</ul>
{/snippet}
