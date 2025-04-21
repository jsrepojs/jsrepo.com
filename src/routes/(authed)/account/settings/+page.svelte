<script lang="ts">
	import * as Nav from '$lib/components/site/nav';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Meter } from '$lib/components/ui/meter';
	import { ChevronLeft, Plus } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Settings - Account - jsrepo</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<a
		href="/account"
		class="flex place-items-center gap-2 text-muted-foreground transition-all hover:text-foreground"
	>
		<ChevronLeft />
		Back to Account
	</a>
	<div class="flex flex-col gap-2">
		<div class="flex place-items-center justify-between">
			<Nav.Title>Settings</Nav.Title>
		</div>
	</div>
</div>
