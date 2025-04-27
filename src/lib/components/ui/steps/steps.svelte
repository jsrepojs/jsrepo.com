<script lang="ts">
	import { cn } from '$lib/utils/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, children }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class={cn('steps flex flex-col gap-4', className)}>
	{@render children?.()}
</div>

<style lang="pcss">
	.steps {
		counter-reset: step;
		@apply relative;
	}

	.steps::before {
		content: '';
		@apply absolute left-[18px] h-full w-px bg-border;
	}

	:global(.steps .step) {
		counter-increment: step;
		@apply relative pl-12;
	}

	:global(.steps .step > h3::before) {
		content: counter(step);
		@apply absolute left-0 top-0 flex size-9 place-items-center justify-center rounded-full bg-card text-center font-mono text-base text-card-foreground;
	}

	:global(.steps .step > h3) {
		@apply mb-3 mt-1 text-2xl font-bold;
	}

	:global(.steps .step > div) {
		@apply flex flex-col gap-2;
	}
</style>
