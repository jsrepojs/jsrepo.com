<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	let { class: className, children, ...rest }: HTMLAnchorAttributes = $props();
</script>

<a {...rest} class={cn('text-lg font-medium', className)}>
	<span class="absolute inset-0"></span>
	{@render children?.()}
</a>
