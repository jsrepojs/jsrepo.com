<script lang="ts">
	import * as List from '$lib/components/site/list';
	import { parsePackageName } from '$lib/ts/parse-package-name';
	import type { RegistryInfo } from './types';

	type Props = {
		registryInfo: RegistryInfo;
	};

	let { registryInfo }: Props = $props();
</script>

<div class="flex flex-col gap-4 py-2">
	{#if registryInfo.dependencies.length === 0}
		<List.Empty>This registry doesn't have any dependencies.</List.Empty>
	{:else}
		<List.Root>
			<List.List>
				{#if registryInfo.version === 'v2'}
					{#each registryInfo.dependencies as dependency (dependency)}
						{@const pkg = parsePackageName(dependency).unwrap()}
						<List.Item class="flex place-items-center justify-between">
							<List.Link href="https://npmjs.com/package/{pkg.name}" target="_blank">
								{dependency}
							</List.Link>
						</List.Item>
					{/each}
				{:else}
					{#each registryInfo.dependencies as dependency (dependency)}
						<List.Item class="flex place-items-center justify-between">
							{#if dependency.ecosystem === 'js'}
								<List.Link href="https://npmjs.com/package/{dependency.name}" target="_blank">
									{dependency.name}{dependency.version ? `@${dependency.version}` : ''}
								</List.Link>
							{:else}
								<span>
									{dependency.name}{dependency.version ? `@${dependency.version}` : ''}
								</span>
							{/if}
						</List.Item>
					{/each}
				{/if}
			</List.List>
		</List.Root>
	{/if}
</div>
