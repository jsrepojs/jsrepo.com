<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';
	import * as Nav from '$lib/components/site/nav';
	import type { Snippet } from 'svelte';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		title?: string;
		actions?: Snippet<[]>;
	}

	let { title, actions, class: className, children, ...rest }: Props = $props();
</script>

<div {...rest} class={cn('flex flex-col gap-2', className)}>
	{#if actions}
		<div class="flex place-items-end justify-between">
			<span>
				{#if title}
					<Nav.Title>{title}</Nav.Title>
				{/if}
			</span>
			{@render actions()}
		</div>
	{:else if title}
		<Nav.Title>{title}</Nav.Title>
	{/if}
	{@render children?.()}
</div>
