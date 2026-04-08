<!--
	Installed from github/SikandarJODD/cnblocks
-->

<script lang="ts">
	import { ArrowUpRight } from '@lucide/svelte';

	const links = [
		{
			title: 'Home',
			href: '/'
		},
		{
			title: 'Help',
			href: '/help'
		},
		{
			title: 'Terms of Service',
			href: '/terms-of-service'
		},
		{
			title: 'Docs',
			href: 'https://jsrepo.dev/docs'
		},
		{
			title: 'GitHub',
			href: 'https://github.com/jsrepojs'
		}
	];
</script>

<footer class="border-t py-12">
	<div class="container">
		<div class="flex flex-wrap justify-between gap-6">
			<span class="text-muted-foreground order-last block text-center text-sm md:order-first">
				© 2026 jsrepo, All rights reserved
			</span>
			<div class="order-first flex flex-wrap justify-center gap-6 text-sm md:order-last">
				{#each links as link (link.href)}
					{@const isExternal = link.href.startsWith('https://')}
					<a
						href={link.href}
						target={isExternal ? '_blank' : undefined}
						class="text-muted-foreground hover:text-foreground flex place-items-center gap-0.5 duration-150"
					>
						<span>{link.title}</span>
						{#if isExternal}
							<ArrowUpRight class="size-4" />
						{/if}
					</a>
				{/each}
			</div>
		</div>
	</div>
</footer>
