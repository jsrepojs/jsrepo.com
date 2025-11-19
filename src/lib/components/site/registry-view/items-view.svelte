<script lang="ts">
	import * as List from '$lib/components/site/list';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { FileIcon } from '$lib/components/ui/file-icon';
	import { determinePrimaryLanguage, parseFileExtension } from '$lib/ts/registry';
	import { FlaskRound } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Download, File } from '@lucide/svelte';
	import { ChevronRight } from '@lucide/svelte';
	import type { RegistryViewPageData } from './types';
	import { cn } from '$lib/utils/utils';

	let { data, hasLicense }: { data: RegistryViewPageData; hasLicense: boolean } = $props();
</script>

<List.Root class="flex flex-col gap-2 py-2">
	<List.List>
		{#if data.manifest.manifestVersion === 'v2'}
			{#each data.manifest.categories as category (category)}
				{#each category.blocks.filter((b) => b.list) as block (block.name)}
					{@const primaryLanguage = determinePrimaryLanguage(...block.files)}
					<Collapsible.Root>
						<List.Item class="hover:bg-card p-0">
							<div class="flex w-full place-items-center justify-between p-4">
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
								<div class="flex place-items-center gap-2">
									<Button
										variant="ghost"
										size="icon"
										disabled={data.registry.access === 'marketplace' && !hasLicense}
										download="{category.name}_{block.name}.zip"
										href="/api/scopes/@{data.scopeName}/{data.registryName}/v/{data.versionParam}/blocks/{category.name}/{block.name}/download"
									>
										<Download class="text-muted-foreground size-5" />
									</Button>
									<Collapsible.Trigger>
										{#snippet child({ props })}
											<Button {...props} variant="ghost" size="icon">
												<ChevronRight
													class={cn('text-muted-foreground size-5', {
														'rotate-90': props['aria-expanded'] === 'true'
													})}
												/>
											</Button>
										{/snippet}
									</Collapsible.Trigger>
								</div>
							</div>
						</List.Item>
						<Collapsible.Content>
							<div class="border-border bg-card mt-2 flex flex-col gap-2 rounded-md border p-4">
								<div>
									<span class="text-muted-foreground font-medium">Files</span>
									<ul>
										{#each block.files as file (file)}
											{@const ext = parseFileExtension(file)}
											<li class="flex place-items-center gap-1">
												<div class="flex size-4 place-items-center justify-center">
													<FileIcon extension={ext}>
														{#snippet fallback()}
															<File class="text-muted-foreground size-4" />
														{/snippet}
													</FileIcon>
												</div>
												{file}
											</li>
										{/each}
									</ul>
								</div>
								<div>
									<span class="text-muted-foreground font-medium">Remote Dependencies</span>
									<ul>
										{#each [...block.dependencies, ...block.devDependencies] as dep (dep)}
											<li>{dep}</li>
										{/each}
									</ul>
								</div>
								<div>
									<span class="text-muted-foreground font-medium">Local Dependencies</span>
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
		{:else}
			{#each data.manifest.items.filter((i) => i.add === 'when-added') as item (item.name)}
				{@const primaryLanguage = determinePrimaryLanguage(...item.files.map((f) => f.path))}
				<Collapsible.Root>
					<List.Item class="hover:bg-card p-0">
						<div class="flex w-full place-items-center justify-between p-4">
							<div class="flex place-items-center gap-2">
								<span class="font-medium">
									{item.name}
								</span>
								<FileIcon extension={primaryLanguage} />
								{#if item.files.some((f) => f.type === 'registry:test')}
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
							<div class="flex place-items-center gap-2">
								<Button
									variant="ghost"
									size="icon"
									disabled={data.registry.access === 'marketplace' && !hasLicense}
									download="{item.name}.zip"
									href="/api/scopes/@{data.scopeName}/{data.registryName}/v/{data.versionParam}/items/{item.name}/download"
								>
									<Download class="text-muted-foreground size-5" />
								</Button>
								<Collapsible.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="ghost" size="icon">
											<ChevronRight
												class={cn('text-muted-foreground size-5', {
													'rotate-90': props['aria-expanded'] === 'true'
												})}
											/>
										</Button>
									{/snippet}
								</Collapsible.Trigger>
							</div>
						</div>
					</List.Item>
					<Collapsible.Content>
						<div class="border-border bg-card mt-2 flex flex-col gap-2 rounded-md border p-4">
							<div>
								<span class="text-muted-foreground font-medium">Description</span>
								<p>{item.description}</p>
							</div>
							<div>
								<span class="text-muted-foreground font-medium">Files</span>
								<ul>
									{#each item.files as file (file)}
										{@const ext = parseFileExtension(file.path)}
										<li class="flex place-items-center gap-1">
											<div class="flex size-4 place-items-center justify-center">
												<FileIcon extension={ext}>
													{#snippet fallback()}
														<File class="text-muted-foreground size-4" />
													{/snippet}
												</FileIcon>
											</div>
											{file.path}
										</li>
									{/each}
								</ul>
							</div>
							<div>
								<span class="text-muted-foreground font-medium">Remote Dependencies</span>
								<ul>
									{#each [...(item.dependencies ?? []), ...(item.devDependencies ?? [])] as dep (dep.name)}
										<li>{dep.name}{dep.version ? `@${dep.version}` : ''}</li>
									{/each}
								</ul>
							</div>
							<div>
								<span class="text-muted-foreground font-medium">Local Dependencies</span>
								<ul>
									{#each item.registryDependencies ?? [] as dep (dep)}
										<li>{dep}</li>
									{/each}
								</ul>
							</div>
						</div>
					</Collapsible.Content>
				</Collapsible.Root>
			{/each}
		{/if}
	</List.List>
</List.Root>
