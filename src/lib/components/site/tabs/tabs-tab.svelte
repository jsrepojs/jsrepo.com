<script lang="ts">
	import { active, type Options } from '$lib/actions/active.svelte';
	import { cn } from '$lib/utils';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	let {
		isHash = false,
		isSearch = false,
		activeForSubdirectories = true,
		class: className,
		children,
		tag,
		...rest
	}: HTMLAnchorAttributes & Partial<Options> & { tag?: string } = $props();
</script>

<a
	{...rest}
	use:active={{ activeForSubdirectories, isHash, isSearch }}
	class={cn(
		'border-accent text-muted-foreground hover:text-foreground data-[active=true]:bg-accent data-[active=true]:text-foreground flex w-fit flex-row gap-2 truncate rounded-t-lg border-x border-t border-transparent px-3 py-2 text-base/(--line-height) transition-all',
		className
	)}
	style="--line-height: 24px;"
>
	{@render children?.()}
	{#if tag !== undefined}
		<div class="flex h-(--line-height) place-items-center justify-center">
			<div
				class="bg-primary text-primary-foreground flex size-5 place-items-center justify-center rounded-full font-mono text-xs"
			>
				{tag}
			</div>
		</div>
	{/if}
</a>
