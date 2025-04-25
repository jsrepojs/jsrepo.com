<script lang="ts">
	import { cn } from '$lib/utils/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, children, ...rest }: HTMLAttributes<HTMLDivElement> = $props();
</script>

<div
	{...rest}
	class={cn(
		'flex h-96 flex-col place-items-center justify-center gap-2 text-center text-lg text-muted-foreground',
		className
	)}
>
	{@render children?.()}
</div>
