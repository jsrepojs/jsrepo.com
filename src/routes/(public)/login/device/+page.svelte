<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { UseQuery } from '$lib/hooks/use-query.svelte';
	import { MetaTags } from '$lib/components/site/meta-tags';
	import { authClient } from '$lib/auth/client.js';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import * as Alert from '$lib/components/ui/alert';
	import { Check, Info, Shield } from '@lucide/svelte';

	let { data } = $props();

	const acceptSignIn = new UseQuery(async () => {
		const result = await authClient.oauth2.consent({
			accept: true
		});

		if (result.error) return;

		window.location.href = result.data.redirectURI;
	});
	const denySignIn = new UseQuery(async () => {
		const result = await authClient.oauth2.consent({
			accept: false
		});

		if (result.error) return;

		window.location.href = result.data.redirectURI;
	});
</script>

<MetaTags title="Authorize {data.client.name}? - jsrepo" />

<div
	class="flex min-h-[calc(100svh-var(--header-height))] flex-col place-items-center justify-center gap-2"
>
	<Card.Root class="w-full max-w-md shadow-lg">
		<Card.Header class="space-y-1 text-center">
			<div class="mb-4 flex justify-center">
				<div class="relative h-20 w-20 overflow-hidden rounded-full border p-2">
					<img src={data.client.icon} alt={`${data.client.name} logo`} class="object-contain" />
				</div>
			</div>
			<Card.Title class="text-2xl">{data.client.name} wants access to your account</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<Alert.Root variant="destructive">
				<div class="flex gap-2">
					<Info class="h-4 w-4" />
					<Alert.Description class="text-sm">
						Only authorize applications you trust with your data
					</Alert.Description>
				</div>
			</Alert.Root>

			<div class="space-y-4">
				<h3 class="flex items-center gap-1.5 text-sm font-medium">
					<Shield class="h-4 w-4 text-gray-500" />
					<span>This app will be able to:</span>
				</h3>
			</div>

			<div class="space-x-3">
				<div class="flex items-start space-x-3">
					{@render feature_list({
						features: ['Download code from registries', 'Publish registries']
					})}
				</div>
			</div>
		</Card.Content>
		<Separator />
		<Card.Footer class="flex flex-col gap-4 pt-4">
			<div class="flex w-full gap-3">
				<Button
					onclick={denySignIn.run}
					class="flex-1"
					variant="outline"
					size="lg"
					loading={denySignIn.loading}
				>
					Deny
				</Button>
				<Button onclick={acceptSignIn.run} class="flex-1" size="lg" loading={acceptSignIn.loading}>
					Allow
				</Button>
			</div>
		</Card.Footer>
	</Card.Root>
</div>

{#snippet feature_list({ features }: { features: string[] })}
	<ul class="mb-auto flex flex-col gap-2 text-sm text-muted-foreground">
		{#each features as feature (feature)}
			<li class="flex place-items-start gap-2 text-sm/[--line-height]" style="--line-height: 20px;">
				<span
					data-visible={feature.length > 0}
					class="flex h-[var(--line-height)] place-items-center justify-center opacity-0 data-[visible=true]:opacity-100"
				>
					<Check class="size-4 text-green-400" />
				</span>
				{feature}
			</li>
		{/each}
	</ul>
{/snippet}
