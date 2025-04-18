<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { getInitials } from '$lib/ts/initials';
	import { toRelative } from '$lib/ts/dates.js';

	let { data, children } = $props();

	const user = $derived(data.session.user);
	const joined = $derived(toRelative(user.createdAt));
</script>

<div class="container flex h-svh flex-col gap-4 pt-10">
	<div class="grid place-items-start grid-cols-1 gap-4 md:grid-cols-[8rem_1fr] md:gap-8">
		<div
			class="col-start-1 flex flex-row place-items-center justify-start gap-2 md:flex-col md:justify-center"
		>
			<Avatar.Root class="size-24 md:size-32">
				<Avatar.Image src={user.image} />
				<Avatar.Fallback>{getInitials(user.name)}</Avatar.Fallback>
			</Avatar.Root>
			<div class="flex flex-col">
				<span class="max-w-full text-start md:text-center truncate text-xl font-medium">{user.name}</span>
				<span class="text-muted-foreground text-start md:text-center">Joined {joined}</span>
			</div>
		</div>
		<div class="md:col-start-2 w-full">
			{@render children()}
		</div>
	</div>
</div>
