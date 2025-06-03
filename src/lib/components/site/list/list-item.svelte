<script lang="ts">
	import { cn } from '$lib/utils/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, children, ...rest }: HTMLAttributes<HTMLLIElement> = $props();
</script>

<li
	{...rest}
	class={cn(
		'bg-card hover:bg-accent relative flex place-items-center justify-between rounded-lg border p-4 transition-all',
		className
	)}
>
	{@render children?.()}
</li>
