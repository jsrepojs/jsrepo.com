<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as FieldSet from '$lib/components/ui/field-set';
	import * as Select from '$lib/components/ui/select';
	import { UseQuery } from '$lib/hooks/use-query.svelte';
	import type { UpdateRegistryAccessRequest } from '../../../../routes/api/scopes/[scope=scope]/[name]/access/+server';
	import type { RegistryViewPageData } from './types';
    import * as casing from "$lib/ts/casing"

	let { data }: { data: RegistryViewPageData } = $props();

	let access = $derived(data.registry.access);

	const updateAccessQuery = new UseQuery(async () => {
		const response = await fetch(`/api/scopes/@${data.scopeName}/${data.registryName}/access`, {
			method: 'PATCH',
			body: JSON.stringify({ access } satisfies UpdateRegistryAccessRequest)
		});

		if (response.ok) {
			await invalidateAll();
		}
	});
</script>

<div class="flex flex-col py-2">
	<FieldSet.Root variant="destructive">
		<FieldSet.Content class="flex flex-col gap-2">
			<FieldSet.Title>Access</FieldSet.Title>
			<Select.Root type="single" bind:value={access}>
				<Select.Trigger class="max-w-36">
					{casing.camelToPascal(access)}
				</Select.Trigger>
				<Select.Content align="start">
					<Select.Item value="public">Public</Select.Item>
					<Select.Item value="private">Private</Select.Item>
					<Select.Item value="marketplace">Marketplace</Select.Item>
				</Select.Content>
			</Select.Root>
		</FieldSet.Content>
		<FieldSet.Footer>
			<div class="flex place-items-center justify-between gap-4">
				<div>
					<span class="hidden truncate text-sm text-muted-foreground md:block">
						This determines who can view your registry and add components from the CLI.
					</span>
				</div>
				<Button
					variant="destructive"
					class="shrink-0"
					onclick={updateAccessQuery.run}
					loading={updateAccessQuery.loading}
					disabled={access === data.registry.access}
				>
					Update Access
				</Button>
			</div>
		</FieldSet.Footer>
	</FieldSet.Root>
</div>
