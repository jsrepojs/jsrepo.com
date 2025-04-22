<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import * as List from '$lib/components/site/list';
	import semver from 'semver';
	import * as array from '$lib/ts/array';
	import type { Block, Manifest } from '$lib/ts/registry/manifest';
	import { ChevronRight } from '@lucide/svelte';
	import { cn } from '$lib/utils/utils';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { FileIcon } from '$lib/components/ui/file-icon';

	let { data }: { data: PageData } = $props();

	const tab = $derived(page.url.searchParams.get('tab') ?? '/');

	type RegistryInfo = {
		categories: number;
		blocks: number;
		dependencies: string[];
	};

	function getRegistryInfo(manifest: Manifest): RegistryInfo {
		const dependencies = new Set<string>();

		for (const category of manifest.categories) {
			for (const block of category.blocks) {
				for (const dep of [...block.dependencies, ...block.devDependencies]) {
					dependencies.add(dep);
				}
			}
		}

		return {
			categories: manifest.categories.length,
			blocks: manifest.categories.flatMap((c) => c.blocks).length,
			dependencies: Array.from(dependencies)
		};
	}

	function parseFileExtension(file: string) {
		const index = file.lastIndexOf('.');

		return file.slice(index);
	}

	function determinePrimaryLanguage(...blocks: Block[]) {
		const langMap = new Map<string, number>();

		const ifExistsIncrement = (key: string) => {
			const val = langMap.get(key) ?? 0;

			langMap.set(key, val + 1);
		};

		for (const block of blocks) {
			for (const file of block.files) {
				const ext = parseFileExtension(file);

				if (ext === 'yaml' || ext === 'yml') {
					ifExistsIncrement('yml');
					continue;
				}

				if (ext === 'json' || ext === 'jsonc') {
					ifExistsIncrement('json');
					continue;
				}

				if (ext === 'sass' || ext === 'scss') {
					ifExistsIncrement('sass');
					continue;
				}

				if (blocks.length === 1) {
					if (ext === '.svelte' || ext === 'tsx' || ext === 'jsx' || ext === 'vue') return ext;
				}

				ifExistsIncrement(ext);
			}
		}

		const arr = array
			.fromMap(langMap, (key, value) => ({ key, value }))
			.toSorted((a, b) => b.value - a.value);

		return arr[0].key;
	}

	const registryPrimaryLanguage = $derived(
		determinePrimaryLanguage(...data.manifest.categories.flatMap((c) => c.blocks))
	);

	const registryInfo = $derived(getRegistryInfo(data.manifest));
</script>

<svelte:head>
	<title>@{data.scopeName}/{data.registryName}@{data.version} - jsrepo</title>
</svelte:head>

{#if tab === '/'}
	readme
{:else if tab === 'blocks'}
	<List.Root class="flex flex-col gap-2 py-4" title="Blocks">
		<List.List>
			{#each data.manifest.categories as category (category)}
				{#each category.blocks.filter((b) => b.list) as block (block.name)}
					{@const primaryLanguage = determinePrimaryLanguage(block)}
					<Collapsible.Root>
						<Collapsible.Trigger>
							{#snippet child({ props })}
								<List.Item class="p-0">
									<button {...props} class="flex w-full place-items-center justify-between p-4">
										<div class="flex place-items-center gap-2">
											<span class="font-medium">
												{block.category}/{block.name}
											</span>
											<FileIcon extension={primaryLanguage} />
											{#if block.tests}
												<Tooltip.Provider delayDuration={50}>
													<Tooltip.Root>
														<Tooltip.Trigger>
															<FlaskRound class="size-4 text-blue-400" />
														</Tooltip.Trigger>
														<Tooltip.Content>
															<p>Includes tests</p>
														</Tooltip.Content>
													</Tooltip.Root>
												</Tooltip.Provider>
											{/if}
										</div>
										<ChevronRight
											class={cn('size-5 text-muted-foreground', {
												'rotate-90': props['aria-expanded'] === 'true'
											})}
										/>
									</button>
								</List.Item>
							{/snippet}
						</Collapsible.Trigger>
						<Collapsible.Content>
							<div class="mt-2 flex flex-col gap-2 rounded-md border border-border bg-card p-4">
								<div>
									<span class="font-medium text-muted-foreground">Files</span>
									<ul>
										{#each block.files as file (file)}
											{@const ext = parseFileExtension(file)}
											<li class="flex place-items-center gap-1">
												<div class="flex size-4 place-items-center justify-center">
													<FileIcon extension={ext}>
														{#snippet fallback()}
															<File class="size-4 text-muted-foreground" />
														{/snippet}
													</FileIcon>
												</div>
												{file}
											</li>
										{/each}
									</ul>
								</div>
								<div>
									<span class="font-medium text-muted-foreground">Remote Dependencies</span>
									<ul>
										{#each [...block.dependencies, ...block.devDependencies] as dep (dep)}
											<li>{dep}</li>
										{/each}
									</ul>
								</div>
								<div>
									<span class="font-medium text-muted-foreground">Local Dependencies</span>
									<ul>
										{#each block.localDependencies as dep (dep)}
											<li>{dep}</li>
										{/each}
									</ul>
								</div>
							</div>
						</Collapsible.Content>
					</Collapsible.Root>
				{/each}
			{/each}
		</List.List>
	</List.Root>
{:else if tab === 'dependencies'}
	<div class="flex flex-col gap-4 py-4">
		{#if registryInfo.dependencies.length === 0}
			<p>No dependencies</p>
		{:else}
			<List.Root title="Dependencies">
				<List.List>
					{#each registryInfo.dependencies as dependency (dependency)}
						<List.Item class="flex place-items-center justify-between">
							<span class="">{dependency}</span>
						</List.Item>
					{/each}
				</List.List>
			</List.Root>
		{/if}
	</div>
{:else if tab === 'versions'}
	{@const sortedVersions = data.versions.sort((a, b) => semver.compare(b.version, a.version))}
	{@const taggedVersions = sortedVersions.filter((v) => v.tag !== null)}
	<div class="flex flex-col gap-4 py-4">
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
{/if}
