<script lang="ts">
	import type { Scope } from '$lib/backend/db/schema';
	import ListItem from './list-item.svelte';
	import ListLink from './list-link.svelte';

	type Props = {
		scope: Scope;
	};

	let { scope }: Props = $props();

	const name = $derived(`@${scope.name}`);
</script>

<ListItem>
	<ListLink href="/{name}">
		{name}
	</ListLink>
</ListItem>
