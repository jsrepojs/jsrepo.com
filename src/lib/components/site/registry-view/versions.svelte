<script lang="ts">
	import type { Version } from '$lib/backend/db/schema';
	import semver from 'semver';
	import * as List from '$lib/components/site/list';

	type Props = {
		data: {
			scopeName: string;
			registryName: string;
			versions: Version[];
		};
	};

	let { data }: Props = $props();

	const sortedVersions = $derived(
		data.versions.sort((a, b) => semver.compare(b.version, a.version))
	);
	const taggedVersions = $derived(
		sortedVersions
			.filter((v) => v.tag !== null)
			.toSorted((a, b) => {
				// sort latest tag to the top
				if (a.tag === 'latest' && b.tag !== 'latest') return -1;
				if (b.tag === 'latest' && a.tag !== 'latest') return 1;
				return 0;
			})
	);
</script>

<div class="flex flex-col gap-4 py-2">
	<List.Root title="Tags">
		<List.List>
			{#each taggedVersions as version (version.id)}
				<List.Item class="flex place-items-center justify-between">
					<List.Link href="/@{data.scopeName}/{data.registryName}/v/{version.tag}">
						{version.version}
					</List.Link>
					<span class="font-mono text-sm">@{version.tag}</span>
				</List.Item>
			{/each}
		</List.List>
	</List.Root>
	<List.Root title="Versions">
		<List.List>
			{#each sortedVersions as version (version.id)}
				<List.Item class="flex place-items-center justify-between">
					<List.Link href="/@{data.scopeName}/{data.registryName}/v/{version.version}">
						{version.version}
					</List.Link>
					{#if version.tag}
						<span class="font-mono text-sm">@{version.tag}</span>
					{/if}
				</List.Item>
			{/each}
		</List.List>
	</List.Root>
</div>
