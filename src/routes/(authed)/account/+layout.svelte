<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { getInitials } from '$lib/ts/initials';
	import { Separator } from '$lib/components/ui/separator';
	import SubBadge from '$lib/components/site/sub-badge.svelte';

	let { data, children } = $props();

	const user = $derived(data.user);
</script>

<div class="flex min-h-[calc(100svh-var(--header-height))] flex-col gap-4 pb-4 pt-10">
	<div class="grid grid-cols-1 place-items-start gap-4 md:grid-cols-[8rem_1fr] md:gap-8">
		<div
			class="col-start-1 flex flex-row place-items-center justify-start gap-2 md:flex-col md:justify-center"
		>
			<Avatar.Root class="size-24 md:size-32">
				<Avatar.Image src={user.image} />
				<Avatar.Fallback>{getInitials(user.name)}</Avatar.Fallback>
			</Avatar.Root>
			<div class="flex flex-col md:place-items-center">
				<span class="max-w-full truncate text-start text-xl font-medium md:text-center">
					{user.username}
				</span>
				<div>
					<SubBadge user={data.user} />
				</div>
			</div>
		</div>
		<Separator class="md:hidden" />
		<div class="w-full md:col-start-2">
			{@render children()}
		</div>
	</div>
</div>
