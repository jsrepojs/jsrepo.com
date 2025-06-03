<script lang="ts">
	import BlurFade from '$lib/components/animation/blur-fade.svelte';
	import { MetaTags } from '$lib/components/site/meta-tags';
	import { ArrowUpRight } from '@lucide/svelte';
</script>

<MetaTags title="Thank you! - jsrepo" />

<main
	class="flex min-h-[calc(100svh-var(--header-height))] flex-col place-items-center justify-center"
>
	<div class="flex max-w-sm flex-col place-items-center justify-center gap-2">
		<BlurFade>
			<h1 class="text-center text-6xl font-bold">Thank you!</h1>
		</BlurFade>
		<BlurFade delay={200 / 1000}>
			<p class="text-muted-foreground text-center text-lg">
				We have forwarded your request to our team and you should hear back from us soon!
			</p>
		</BlurFade>
		<div class="text-muted-foreground flex flex-wrap place-items-center gap-6 py-4">
			<BlurFade delay={500 / 1000}>
				<a href="/" class="hover:text-foreground transition-all"> Home </a>
			</BlurFade>
			<BlurFade delay={700 / 1000}>
				<a href="/account" class="hover:text-foreground transition-all"> Account </a>
			</BlurFade>
			<BlurFade delay={900 / 1000}>
				<a href="/docs" class="hover:text-foreground flex place-items-center gap-1 transition-all">
					Docs <ArrowUpRight class="size-4" />
				</a>
			</BlurFade>
		</div>
	</div>
</main>
