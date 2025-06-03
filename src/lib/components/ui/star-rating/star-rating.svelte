<script lang="ts">
	import { cn } from '$lib/utils/utils';
	import { Star } from '@lucide/svelte';
	import { RadioGroup, type RadioGroupRootProps, Label } from 'bits-ui';

	type Props = Omit<RadioGroupRootProps, 'value'> & {
		value?: number;
		stars?: number;
		readonly?: boolean;
	};

	let {
		value = $bindable(1),
		stars = 5,
		disabled = false,
		readonly = false,
		...rest
	}: Props = $props();

	function setRating(rating: number) {
		if (disabled || readonly) return;

		value = rating;
	}
</script>

<RadioGroup.Root
	class="group flex w-fit place-items-center gap-1 rounded-lg outline-none"
	bind:value={() => value.toString(), (v) => (value = parseInt(v))}
	aria-readonly={readonly}
	aria-disabled={disabled}
	orientation="horizontal"
	loop={false}
	disabled={disabled || readonly}
	{...rest}
>
	{#each { length: stars } as _, i (i)}
		{@const rating = i + 1}
		<div class="relative">
			<RadioGroup.Item
				id="rating-{rating}"
				value={rating.toString()}
				onmouseover={() => setRating(rating)}
				class="ring-ring ring-offset-background absolute inset-0 rounded-lg outline-none ring-offset-2 focus-visible:ring-2"
			/>
			<Label.Root for="rating-{rating}">
				<Star
					class={cn(
						'size-5 fill-transparent text-yellow-400 transition-all group-aria-disabled:opacity-50',
						{
							'fill-yellow-400': value >= rating
						}
					)}
				/>
			</Label.Root>
		</div>
	{/each}
</RadioGroup.Root>
