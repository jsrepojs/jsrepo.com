<script lang="ts">
	import { MetaTags } from '$lib/components/site/meta-tags';
	import {
		ArrowRight,
		Building,
		KeyRound,
		Notebook,
		Plus,
		Settings,
		Telescope
	} from '@lucide/svelte';
</script>

<MetaTags title="Account - jsrepo" />

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
	{@render card({
		title: 'Publish a Registry',
		description: 'Publish a registry to jsrepo.com.',
		href: '/account/new-registry',
		Icon: Plus
	})}
	{@render card({
		title: 'Registries',
		description: 'Manage your registries.',
		href: '/account/registries',
		Icon: Notebook
	})}
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
	{@render card({
		title: 'Organizations',
		description: 'Manage your organizations.',
		href: '/account/organizations',
		Icon: Building
	})}
	{@render card({
		title: 'Settings',
		description: 'Manage your account settings and preferences.',
		href: '/account/settings',
		Icon: Settings
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
		class="group border-border bg-card hover:bg-accent relative flex flex-col justify-between gap-4 rounded-lg border p-6 transition-all"
	>
		<div class="flex place-items-start justify-between">
			<div class="flex flex-col place-items-start justify-center">
				<a {href} class="text-2xl font-medium">
					<span class="absolute inset-0"></span>
					{title}
				</a>
				<p class="text-muted-foreground text-lg">{description}</p>
			</div>
			<div class="flex place-items-center justify-center pt-4 pr-4">
				<Icon class="size-6" />
			</div>
		</div>
		<div class="w-full opacity-0 transition-all group-hover:opacity-100">
			<ArrowRight class="scale-50 transition-all group-hover:scale-100" />
		</div>
	</div>
{/snippet}
