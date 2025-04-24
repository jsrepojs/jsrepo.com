<!--
	Installed from github/ieedan/shadcn-svelte-extras
-->

<script lang="ts">
	import { cn } from '$lib/utils/utils';
	import type { WithElementRef } from 'bits-ui';
	import type { HTMLAttributes } from 'svelte/elements';
	import { tv, type VariantProps } from 'tailwind-variants';

	const style = tv({
		base: 'flex h-fit w-full flex-col rounded-lg border border-border',
		variants: {
			variant: {
				default: 'border-border bg-card',
				primary: 'border-primary bg-card',
				destructive: 'border-destructive bg-card'
			}
		}
	});

	type Variant = VariantProps<typeof style>['variant'];

	interface Props extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
		variant?: Variant;
	}

	let { variant = 'default', children, class: className, ...restProps }: Props = $props();
</script>

<div class={cn(style({ variant }), className)} {...restProps}>
	{@render children?.()}
</div>
