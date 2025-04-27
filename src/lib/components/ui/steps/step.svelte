<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		children: Snippet<[]>;
	};

	let { title, children }: Props = $props();
</script>

<div class="step">
	<h3>{title}</h3>
	<div>
		{@render children?.()}
	</div>
</div>
