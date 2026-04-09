<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, children }: HTMLAttributes<HTMLSpanElement> = $props();
</script>

<span class={cn('text-muted-foreground font-mono text-xs tracking-wider uppercase', className)}>
	{@render children?.()}
</span>
