<script lang="ts">
	import { active } from '$lib/actions/active.svelte';
	import { cn } from '$lib/utils/utils';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	let { class: className, children, ...rest }: HTMLAnchorAttributes = $props();
</script>

<a
	{...rest}
	use:active={{ activeForSubdirectories: false }}
	class={cn(
		'flex w-fit flex-row rounded-t-lg border-x border-t px-3 py-2 text-muted-foreground transition-all hover:text-foreground data-[active=false]:border-transparent data-[active=true]:bg-accent data-[active=true]:text-foreground',
		className
	)}
>
	{@render children?.()}
</a>
