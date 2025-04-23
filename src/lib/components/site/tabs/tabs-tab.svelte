<script lang="ts">
	import { active, type Options } from '$lib/actions/active.svelte';
	import { cn } from '$lib/utils/utils';
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
		'flex w-fit flex-row gap-2 rounded-t-lg border-x border-t px-3 py-2 text-base/[--line-height] text-muted-foreground transition-all hover:text-foreground data-[active=false]:border-transparent data-[active=true]:bg-accent data-[active=true]:text-foreground',
		className
	)}
	style="--line-height: 24px;"
>
	{@render children?.()}
	{#if tag !== undefined}
		<div class="flex h-[--line-height] place-items-center justify-center">
			<div
				class="flex size-6 place-items-center justify-center rounded-full bg-primary font-mono text-sm text-primary-foreground"
			>
				{tag}
			</div>
		</div>
	{/if}
</a>
