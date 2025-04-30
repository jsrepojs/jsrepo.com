<script lang="ts">
	import * as FieldSet from '$lib/components/ui/field-set';
	import { Meter } from '$lib/components/ui/meter';
	import { Button } from '$lib/components/ui/button';

	let { data } = $props();

	const occupiedSeats = $derived(data.org.members.length);
</script>

<svelte:head>
	<title>Settings - jsrepo - jsrepo</title>
</svelte:head>

<div class="flex flex-col gap-2 py-2">
	<FieldSet.Root>
		<FieldSet.Content>
			<FieldSet.Title>Seats</FieldSet.Title>
			<div class="flex flex-col gap-2">
				<div class="flex place-items-center justify-end">
					<span class="text-sm text-muted-foreground">
						{occupiedSeats} / {data.org.subscription?.seats ?? 0}
					</span>
				</div>
				<Meter min={0} max={data.org.subscription?.seats ?? 0} value={occupiedSeats} />
				<span class="text-xs text-muted-foreground">
					Your organization has {Math.max((data.org.subscription?.seats ?? 0) - occupiedSeats, 0)}
					seats remaining.
				</span>
			</div>
		</FieldSet.Content>
		<FieldSet.Footer class="flex place-items-center justify-between">
			<span class="text-sm text-muted-foreground"> Need more seats? </span>
			<Button disabled={data.member.role !== 'owner'}>Manage</Button>
		</FieldSet.Footer>
	</FieldSet.Root>
</div>
