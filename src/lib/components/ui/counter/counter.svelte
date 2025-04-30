<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Minus, Plus } from '@lucide/svelte';

	type Props = {
		min?: number;
		max?: number;
		value?: number;
		label?: string;
		increment?: number;
	};

	let { min, max, value = $bindable(0), label, increment = 1 }: Props = $props();

	function inc() {
		value = value + increment;
	}

	function dec() {
		value = value - increment;
	}
</script>

<div class="flex place-items-center gap-4">
	<Button
		onclick={dec}
		variant="outline"
		size="icon"
		class="rounded-full"
		disabled={min !== undefined && value - increment < min}
	>
		<Minus />
	</Button>
	<div class="flex flex-col text-center">
		<span class="text-3xl">
			{value}
		</span>
		{#if label}
			<span class="text-sm text-muted-foreground">
				{label}
			</span>
		{/if}
	</div>
	<Button
		onclick={inc}
		variant="outline"
		size="icon"
		class="rounded-full"
		disabled={max !== undefined && value + increment > max}
	>
		<Plus />
	</Button>
</div>
