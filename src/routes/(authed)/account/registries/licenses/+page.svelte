<script lang="ts">
	import * as List from '$lib/components/site/list';
	import { MetaTags } from '$lib/components/site/meta-tags';

	let { data } = $props();
</script>

<MetaTags title="Licenses - Registries - Account - jsrepo" />

<div class="flex flex-col gap-4">
	{#if data.licenses.length === 0}
		<List.Empty>You haven't purchased any licenses yet.</List.Empty>
	{:else}
		<List.Root>
			<List.List>
				{#each data.licenses as license (license.id)}
					{@const registryName = `@${license.scope.name}/${license.registry.name}`}
					<List.Item>
						<div class="flex flex-col">
							<List.Link href="/{registryName}">
								{registryName}
							</List.Link>
							<span class="text-sm text-muted-foreground">
								Perpetual {license.referenceId.startsWith('org_')
									? `Organization License for ${license.org?.name}`
									: 'Individual License'}
							</span>
						</div>
					</List.Item>
				{/each}
			</List.List>
		</List.Root>
	{/if}
</div>
