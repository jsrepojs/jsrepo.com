<script lang="ts">
	import { cn } from '$lib/utils/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, children, ...rest }: HTMLAttributes<HTMLUListElement> = $props();
</script>

<ul {...rest} class={cn('text-muted-foreground flex flex-col font-light', className)}>
	{@render children?.()}
</ul>
