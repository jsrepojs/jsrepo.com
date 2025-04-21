<script lang="ts">
	import { cn } from '$lib/utils/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, children, ...rest }: HTMLAttributes<HTMLLIElement> = $props();
</script>

<li
	{...rest}
	class={cn(
		'relative flex place-items-center justify-between rounded-lg border bg-card p-4 transition-all hover:bg-accent',
		className
	)}
>
	{@render children?.()}
</li>
