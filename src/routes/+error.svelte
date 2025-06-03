<script lang="ts">
	import { page } from '$app/state';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import BlurFade from '$lib/components/animation/blur-fade.svelte';
	import { ArrowUpRight } from '@lucide/svelte';
	import { buttonVariants } from '$lib/components/ui/button';
	import { Code } from '$lib/components/ui/code';
	import type { SupportReason } from '$lib/ts/help';
</script>

<div class="flex min-h-[calc(100svh-var(--header-height))] place-items-center justify-center">
	<div class="flex flex-col">
		<h1 class="text-center font-mono font-bold" style="font-size: 150px;">
			{page.status}
		</h1>
		{#if page.status !== 404}
			<p class="text-center text-muted-foreground">Whoops, something went wrong!</p>
		{:else}
			<p class="text-center text-muted-foreground">Seems like you lost your way!</p>
		{/if}
		<div class="flex flex-wrap place-items-center justify-center gap-6 py-4 text-muted-foreground">
			<BlurFade delay={100 / 1000}>
				<a href="/" class="transition-all hover:text-foreground"> Home </a>
			</BlurFade>
			<BlurFade delay={300 / 1000}>
				<a href="/account" class="transition-all hover:text-foreground"> Account </a>
			</BlurFade>
			<BlurFade delay={500 / 1000}>
				<a
					href="https://jsrepo.dev/docs"
					class="flex place-items-center gap-1 transition-all hover:text-foreground"
				>
					Docs <ArrowUpRight class="size-4" />
				</a>
			</BlurFade>
			<BlurFade delay={600 / 1000}>
				<a
					href="/help?reason={'bug' as SupportReason}&subject={page.status} on {page.url.pathname}"
					class="transition-all hover:text-foreground"
				>
					Help
				</a>
			</BlurFade>
		</div>

		<Collapsible.Root>
			<div class="flex justify-center">
				<Collapsible.Trigger class={buttonVariants({ variant: 'outline' })}>
					Details
				</Collapsible.Trigger>
			</div>
			<Collapsible.Content class="py-2">
				<Code lang="diff" code={page.error?.message ?? 'Unknown Error'} hideLines hideCopy />
			</Collapsible.Content>
		</Collapsible.Root>
	</div>
</div>
