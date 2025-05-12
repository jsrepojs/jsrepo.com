<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import { DateFormatter, type DateValue, getLocalTimeZone } from '@internationalized/date';
	import * as Popover from '$lib/components/ui/popover';
	import type { WithoutChildrenOrChild, Calendar as CalendarPrimitive } from 'bits-ui';
	import Calendar from './calendar.svelte';
	import { buttonVariants } from '../button';
	import { cn } from '$lib/utils/utils';

	let {
		ref = $bindable(null),
		value = $bindable(),
		placeholder = $bindable(),
        class: className,
		weekdayFormat = 'short',
		...restProps
	}: WithoutChildrenOrChild<CalendarPrimitive.RootProps> = $props();

	const df = new DateFormatter('en-US', {
		dateStyle: 'long'
	});
</script>

<Popover.Root>
	<Popover.Trigger
		class={cn(
			buttonVariants({
				variant: 'outline',
				class: 'w-full justify-start text-left font-normal'
			}),
			!value && 'text-muted-foreground'
		)}
	>
		<CalendarIcon />
		{#if Array.isArray(value)}
			{#if value.length === 0}
				Pick a date
			{:else}
				<span>{value ? df.format(value[0].toDate(getLocalTimeZone())) : ''}</span>
				<span>-</span>
				<span>{value ? df.format(value[1].toDate(getLocalTimeZone())) : ''}</span>
			{/if}
		{:else}
			{value ? df.format(value.toDate(getLocalTimeZone())) : 'Pick a date'}
		{/if}
	</Popover.Trigger>
	<Popover.Content class="w-auto p-0">
		<Calendar
			bind:value={value as never}
			bind:ref
			bind:placeholder
			{weekdayFormat}
            class={cn('border-none', className)}
			{...restProps}
		/>
	</Popover.Content>
</Popover.Root>
