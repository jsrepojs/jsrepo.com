<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';

	let { children } = $props();
</script>

<div class="flex flex-col gap-2">
	<a
		href="/account"
		class="flex place-items-center gap-2 py-2 text-muted-foreground transition-all hover:text-foreground"
	>
		<ChevronLeft />
		Back to Account
	</a>
	{@render children()}
</div>
