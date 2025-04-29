<script lang="ts">
	import { upgradeSubscription } from '$lib/auth/components/utils';
	import { Button } from '$lib/components/ui/button';
	import { Check } from '@lucide/svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import type { PlanName } from '$lib/ts/stripe/client';
	import { cn } from '$lib/utils/utils';
	import { redirectToLogin } from '$lib/auth/redirect';
	import { page } from '$app/state';

	let { data } = $props();

	type Plan = {
		monthly: number | null;
		yearly: number | null;
		features: string[];
		cta: string;
		per?: string;
		preferred?: boolean;
		successUrl?: string;
	};

	const plans: Record<PlanName | 'Free', Plan> = {
		Free: {
			yearly: null,
			monthly: null,
			cta: 'Get Started For Free',
			features: ['Publish and install code from public registries', '5 registry scopes']
		},
		Pro: {
			yearly: 100,
			monthly: 10,
			cta: 'Get Started',
			features: ['Unlimited registry scopes', 'Publish and install code from private registries'],
			preferred: true
		},
		Team: {
			yearly: 100,
			monthly: 10,
			per: 'user',
			cta: 'Get Started',
			features: [
				'Unlimited registry scopes',
				'Publish and install code from private registries',
				'Create and invite team members to organizations'
			],
			successUrl: '/account/organizations'
		}
	} as const;

	let pricing = $state<'monthly' | 'yearly'>('monthly');
</script>

<svelte:head>
	<title>Pricing - jsrepo</title>
</svelte:head>

<div class="flex flex-col">
	<div class="mt-[10svh] flex flex-col place-items-center gap-2">
		<h1 class="text-6xl font-bold">Pricing</h1>
		<p class="text-center text-lg text-muted-foreground">Decide what's right for you.</p>
		<div class="flex flex-col place-items-center justify-center gap-4 py-8">
			<Tabs.Root bind:value={pricing}>
				<Tabs.List>
					<Tabs.Trigger value="monthly">Monthly</Tabs.Trigger>
					<Tabs.Trigger value="yearly" class="w-36">
						Yearly
						<span
							class="text-nowrap rounded-lg bg-primary/20 px-1.5 py-0.5 text-xs text-primary/80"
						>
							-20 %
						</span>
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
			<div class="grid w-fit max-w-6xl grid-cols-1 place-items-center gap-4 lg:grid-cols-3">
				{#each Object.entries(plans) as [name, plan], i (name)}
					<div
						class={cn(
							'col-start-1 flex h-full w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card/50 p-6 lg:h-[450px]',
							{
								'border-primary': plan.preferred
							}
						)}
						style="grid-column-start: {i + 1};"
					>
						<div class="flex w-full flex-col gap-2 text-left">
							<h3 class="flex place-items-center gap-2 text-left text-2xl">
								{name}
								{#if pricing === 'yearly' && plan.yearly !== null}
									<span
										class="text-nowrap rounded-lg bg-primary/20 px-1.5 py-0.5 text-xs text-primary/80"
									>
										-20 %
									</span>
								{/if}
							</h3>
							<div class="flex flex-col">
								<span class="flex place-items-end gap-1 text-left text-5xl font-medium">
									{#if pricing === 'monthly'}
										${plan.monthly ? plan.monthly : 0}
									{:else}
										${plan.yearly ? plan.yearly : 0}
									{/if}
									{#if plan.per}
										<span class="mb-1 text-sm text-muted-foreground">
											per {plan.per}
										</span>
									{/if}
								</span>
								<span>per {pricing === 'monthly' ? 'month' : 'year'}</span>
							</div>
						</div>
						{@render feature_list({
							features: plan.features
						})}
						<Button
							onclick={() => {
								if (name === 'Free') return;

								if (!data.session) return;

								upgradeSubscription({
									plan: name as PlanName,
									annual: pricing === 'yearly',
									successUrl: plan.successUrl,
									userId: data.session.user.id
								});
							}}
							href={name === 'Free'
								? '/login'
								: data.session === null
									? redirectToLogin(page.url)
									: undefined}
							variant={plan.preferred ? 'default' : 'outline'}
						>
							{plan.cta}
						</Button>
					</div>
				{/each}
			</div>
		</div>
	</div>
	<div class="my-20 flex flex-col place-items-center justify-center gap-2">
		<h2 class="text-center text-3xl font-bold">Can't decide?</h2>
		<p class="text-muted-foreground">
			Were here to help! Shoot us an email and let's talk about it!
		</p>
		<Button href="/help?reason=pricing" variant="outline">Contact Us</Button>
	</div>
</div>

{#snippet feature_list({ features }: { features: string[] })}
	<ul class="mb-auto flex flex-col gap-2 text-sm text-muted-foreground">
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
