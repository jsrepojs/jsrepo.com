<script lang="ts">
	import { Button, type ButtonProps } from '$lib/components/ui/button';
	import { cn } from '$lib/utils/utils';

	let { class: className, children, ...rest }: ButtonProps = $props();
</script>

<Button {...rest} variant="outline" size="lg" class={cn('w-full', className)}>
	{@render children?.()}
</Button>
