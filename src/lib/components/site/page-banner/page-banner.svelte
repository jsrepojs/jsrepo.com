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
		'bg-destructive text-destructive-foreground fixed top-(--header-height) left-0 z-10 w-full py-2',
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
