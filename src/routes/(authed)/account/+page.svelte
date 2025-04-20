<script lang="ts">
	import { ArrowRight, KeyRound, Telescope } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Account - jsrepo</title>
</svelte:head>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
	{@render card({
		title: 'Scopes',
		description: 'Manage your scopes.',
		href: '/account/scopes',
		Icon: Telescope
	})}
	{@render card({
		title: 'Access Tokens',
		description: 'Manage your access tokens.',
		href: '/account/access-tokens',
		Icon: KeyRound
	})}
</div>

{#snippet card({
	Icon,
	href,
	title,
	description
}: {
	href: string;
	title: string;
	description: string;
	Icon: typeof ArrowRight;
})}
	<div
		class="group relative flex flex-col justify-between gap-4 rounded-lg border border-border p-6 transition-all hover:bg-accent"
	>
		<div class="flex place-items-start justify-between">
			<div class="flex flex-col place-items-start justify-center">
				<a {href} class="text-2xl font-medium">
					<span class="absolute inset-0"></span>
					{title}
				</a>
				<p class="text-lg text-muted-foreground">{description}</p>
			</div>
			<div class="flex place-items-center justify-center pr-4 pt-4">
				<Icon class="size-6" />
			</div>
		</div>
		<div class="w-full opacity-0 transition-all group-hover:opacity-100">
			<ArrowRight class="scale-50 transition-all group-hover:scale-100" />
		</div>
	</div>
{/snippet}
