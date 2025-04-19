<script lang="ts">
	import { Meter as MeterPrimitive, type WithoutChildrenOrChild } from "bits-ui";
	import { cn } from "$lib/utils/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		max = 100,
		value,
		...restProps
	}: WithoutChildrenOrChild<MeterPrimitive.RootProps> = $props();
</script>

<MeterPrimitive.Root
	bind:ref
    {max}
	{value}
	class={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", className)}
	{...restProps}
>
	<div
		class="bg-primary h-full w-full flex-1 transition-all"
		style={`transform: translateX(-${100 - (100 * (value ?? 0)) / (max ?? 1)}%)`}
	></div>
</MeterPrimitive.Root>