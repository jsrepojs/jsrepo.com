<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, children, ...rest }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div
	{...rest}
	class={cn(
		'text-muted-foreground flex h-96 flex-col place-items-center justify-center gap-2 text-center text-lg',
		className
	)}
>
	{@render children?.()}
</div>
