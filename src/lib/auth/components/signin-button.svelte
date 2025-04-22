<script lang="ts">
	import { Button, type ButtonProps } from '$lib/components/ui/button';
	import { cn } from '$lib/utils/utils';

	let { class: className, children, ...rest }: ButtonProps = $props();
</script>

<Button
	{...rest}
	variant="outline"
	size="lg"
	class={cn('flex h-12 w-full place-items-center gap-2', className)}
>
	{@render children?.()}
</Button>
