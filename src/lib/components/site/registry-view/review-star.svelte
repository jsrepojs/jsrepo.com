<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = {
		percent: number;
		class?: string;
		fill?: 'background' | 'border';
	};

	let { percent, class: className, fill = 'background' }: Props = $props();
</script>

<span class={cn('size-5', className)} style="position: relative; display: inline-block;">
	<!-- Empty star (background) -->
	<svg
		viewBox="0 0 24 24"
		fill="none"
		class="absolute top-0 left-0"
		width="100%"
		height="100%"
		style="position: absolute; top: 0; left: 0;"
	>
		<path
			d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
			class={{ 'fill-background': fill === 'background', 'fill-border': fill === 'border' }}
		/>
	</svg>
	<!-- Filled star (foreground) -->
	<svg
		viewBox="0 0 24 24"
		fill="none"
		class="absolute top-0 left-0"
		width="100%"
		height="100%"
		style="position: absolute; top: 0; left: 0; clip-path: inset(0 {100 - percent}% 0 0);"
	>
		<path
			d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
			class="fill-yellow-400"
		/>
	</svg>
	<!-- For stacking, invisible -->
	<span style="opacity: 0;">
		<svg viewBox="0 0 24 24" width="100%" height="100%">
			<path
				d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
			/>
		</svg>
	</span>
</span>
