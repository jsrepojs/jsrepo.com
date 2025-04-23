<script lang="ts">
	import { ArrowUpRight } from '@lucide/svelte';
	import { IsMounted } from 'runed';

	const isMounted = new IsMounted();
</script>

<svelte:head>
	<title>Thank you! - jsrepo</title>
</svelte:head>

<main
	class="flex min-h-[calc(100svh-var(--header-height))] flex-col place-items-center justify-center"
>
	<div class="flex max-w-sm flex-col place-items-center justify-center gap-2">
		{#if isMounted.current}
			<h1 class="text-center text-6xl font-bold">Thank you!</h1>
			<p class="text-center text-lg text-muted-foreground">
				We have forwarded your request to our team and you should hear back from us soon!
			</p>
			<div class="flex flex-wrap place-items-center gap-6 py-4 text-muted-foreground">
				<a href="/" class="transition-all hover:text-foreground"> Home </a>
				<a href="/account" class="transition-all hover:text-foreground"> Account </a>
				<a href="/docs" class="flex place-items-center gap-1 transition-all hover:text-foreground">
					Docs <ArrowUpRight class="size-4" />
				</a>
			</div>
		{/if}
	</div>
</main>
