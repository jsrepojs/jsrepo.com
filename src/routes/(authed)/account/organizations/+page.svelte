<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Plus } from '@lucide/svelte';
	import * as List from '$lib/components/site/list';
	import { MetaTags } from '$lib/components/site/meta-tags';

	let { data } = $props();
</script>

<MetaTags title="Organizations - Account - jsrepo"/>

<div class="flex flex-col gap-4">
	<List.Root title="Your Organizations">
		{#snippet actions()}
			<Button href="/account/organizations/new">
				<Plus /> New
			</Button>
		{/snippet}
		<List.List>
			{#each data.organizations as organization (organization.org.id)}
				<List.Item>
					<List.Link href="/{organization.org.name}">
						{organization.org.name}
					</List.Link>
				</List.Item>
			{/each}
		</List.List>
	</List.Root>
</div>
