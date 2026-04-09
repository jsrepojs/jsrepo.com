<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, children, ...rest }: HTMLAttributes<HTMLUListElement> = $props();
</script>

<ul {...rest} class={cn('flex flex-col gap-2', className)}>
	{@render children?.()}
</ul>
