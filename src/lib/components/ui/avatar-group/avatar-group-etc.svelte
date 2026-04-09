<!--
	Installed from github/ieedan/shadcn-svelte-extras
-->

<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = {
		class?: string;
		plus: number;
	};

	let { plus, class: className }: Props = $props();
</script>

<div
	class={cn(
		'bg-accent ring-background relative flex size-10 items-center justify-center rounded-full text-sm ring-2',
		className
	)}
>
	<span>+{plus}</span>
</div>
