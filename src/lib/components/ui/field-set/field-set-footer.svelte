<!--
	Installed from github/ieedan/shadcn-svelte-extras
-->

<script lang="ts">
	import { cn } from '$lib/utils';
	import type { WithElementRef } from 'bits-ui';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
		class?: string;
	}

	let {
		class: className = undefined,
		ref = $bindable(null),
		children,
		...restProps
	}: Props = $props();
</script>

<div bind:this={ref} class={cn('border-t border-inherit px-6 py-3', className)} {...restProps}>
	{@render children?.()}
</div>
