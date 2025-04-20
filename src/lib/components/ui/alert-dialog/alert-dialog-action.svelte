<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import { buttonVariants, type ButtonProps } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils/utils.js';

	let {
		class: className,
		variant,
		ref = $bindable(null),
		...restProps
	}: AlertDialogPrimitive.ActionProps & { variant: ButtonProps['variant'] } = $props();
</script>

<AlertDialogPrimitive.Action
	bind:ref
	class={cn(buttonVariants({ variant }), className)}
	{...restProps}
/>
