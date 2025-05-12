<script lang="ts">
	import { cn } from '$lib/utils/utils';
	import type { Snippet } from 'svelte';

	type Props = {
		class?: string;
		children: Snippet<[]>;
	};

	let { class: className, children }: Props = $props();
</script>

<div
	class={cn(
		'fixed left-0 top-[--header-height] z-10 w-full bg-destructive py-2 text-destructive-foreground',
		className
	)}
>
	<div class="container">
		<span>
			{@render children()}
		</span>
	</div>
</div>
<!-- This renders another container of the same size so that everything lines up correctly -->
<div class="py-2 opacity-0">
	<div>
		<span>
			{@render children()}
		</span>
	</div>
</div>
