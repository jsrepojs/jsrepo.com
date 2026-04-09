<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, children }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class={cn('steps flex flex-col gap-4', className)}>
	{@render children?.()}
</div>

<style>
	@reference '../../../../app.css';

	.steps {
		counter-reset: step;
		@apply relative;
	}

	.steps::before {
		content: '';
		@apply bg-border absolute left-[18px] h-full w-px;
	}

	:global(.steps .step) {
		counter-increment: step;
		@apply relative pl-12;
	}

	:global(.steps .step > h3::before) {
		content: counter(step);
		@apply bg-card text-card-foreground absolute top-0 left-0 flex size-9 place-items-center justify-center rounded-full text-center font-mono text-base;
	}

	:global(.steps .step > h3) {
		@apply mt-1 mb-3 text-2xl font-bold;
	}

	:global(.steps .step > div) {
		@apply flex flex-col gap-2;
	}
</style>
