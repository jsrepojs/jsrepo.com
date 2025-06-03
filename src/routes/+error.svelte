<script lang="ts">
	import { page } from '$app/state';
	import BlurFade from '$lib/components/animation/blur-fade.svelte';
	import { ArrowUpRight } from '@lucide/svelte';
</script>

<div class="flex min-h-[calc(100svh-var(--header-height))] place-items-center justify-center">
	<div class="flex flex-col">
		<h1 class="text-center font-mono font-bold" style="font-size: 150px;">
			{page.status}
		</h1>
		{#if page.status !== 404}
			<p class="text-muted-foreground text-center">Whoops, something went wrong!</p>
		{:else}
			<p class="text-muted-foreground text-center">Seems like you lost your way!</p>
		{/if}
		<div class="text-muted-foreground flex flex-wrap place-items-center justify-center gap-6 py-4">
			<BlurFade delay={100 / 1000}>
				<a href="/" class="hover:text-foreground transition-all"> Home </a>
			</BlurFade>
			<BlurFade delay={300 / 1000}>
				<a href="/account" class="hover:text-foreground transition-all"> Account </a>
			</BlurFade>
			<BlurFade delay={500 / 1000}>
				<a href="/docs" class="hover:text-foreground flex place-items-center gap-1 transition-all">
					Docs <ArrowUpRight class="size-4" />
				</a>
			</BlurFade>
		</div>
	</div>
</div>
