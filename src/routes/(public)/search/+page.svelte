<script lang="ts">
	import * as List from '$lib/components/site/list';
	import * as Pagination from '$lib/components/ui/pagination';
	import { queryParameters } from 'sveltekit-search-params';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import * as Select from '$lib/components/ui/select';
	import type { ListItem } from '$lib/ts/types.js';
	import { FileIcon } from '$lib/components/ui/file-icon';

	const langOptions: ListItem<string>[] = [
		{
			label: 'TypeScript',
			value: 'ts'
		},
		{
			label: 'JavaScript',
			value: 'js'
		},
		{
			label: 'React (JavaScript)',
			value: 'jsx'
		},
		{
			label: 'React (TypeScript)',
			value: 'tsx'
		},
		{
			label: 'Svelte',
			value: 'svelte'
		},
		{
			label: 'Vue',
			value: 'vue'
		},
		{
			label: 'HTML',
			value: 'html'
		}
	];

	const sortByOptions: ListItem<string>[] = [
		{
			label: 'Default',
			value: 'default'
		},
		{
			label: 'Most Popular',
			value: 'most_popular'
		},
		{
			label: 'Newest',
			value: 'newest'
		},
		{
			label: 'Oldest',
			value: 'oldest'
		},
		{
			label: 'Recently Published',
			value: 'recently_published'
		}
	];

	let { data } = $props();

	const params = queryParameters();

	let page = $state($params.page ?? 1);
	let sortBy = $state($params.order_by ?? 'default');
	let lang = $state($params.lang ?? '');

	const langLabel = $derived(langOptions.find((o) => o.value === lang)?.label);
</script>

<svelte:head>
	<title>Search Registries - jsrepo</title>
</svelte:head>

<div class="flex flex-col gap-2 py-2">
	<div class="flex place-items-center justify-between">
		<div>
			<span class="hidden md:block">
				{data.total} registries found
			</span>
		</div>
		<div class="flex flex-wrap place-items-center justify-end gap-2">
			<Select.Root
				type="single"
				allowDeselect
				bind:value={lang}
				onValueChange={(v) => ($params.lang = v)}
			>
				<Select.Trigger class="w-fit gap-1">
					{#if langLabel}
						<span>Lang: {langLabel}</span>
					{:else}
						<span>Lang</span>
					{/if}
				</Select.Trigger>
				<Select.Content align="end">
					{#each langOptions as option (option.value)}
						<Select.Item value={option.value}>
							<FileIcon extension={option.value} />
							<span class="pl-2">{option.label}</span>
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			<Select.Root type="single" bind:value={sortBy} onValueChange={(v) => ($params.order_by = v)}>
				<Select.Trigger class="w-fit gap-1">
					Sort By: {sortByOptions.find((o) => o.value === sortBy)?.label}
				</Select.Trigger>
				<Select.Content align="end">
					{#each sortByOptions as option (option.value)}
						<Select.Item {...option} />
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>
	{#if data.total === 0}
		<List.Empty>No registries found.</List.Empty>
	{:else}
		<List.Root>
			<List.List>
				{#each data.registries as registry (registry.id)}
					<List.Registry {registry} />
				{/each}
			</List.List>
		</List.Root>
	{/if}

	<Pagination.Root
		bind:page
		onPageChange={(v) => ($params.page = v)}
		count={data.total}
		perPage={data.LIMIT}
	>
		{#snippet children({ pages, currentPage })}
			{#if pages.length > 1}
				<Pagination.Content>
					<Pagination.Item>
						<Pagination.PrevButton>
							<ChevronLeft class="size-4" />
							<span class="hidden sm:block">Previous</span>
						</Pagination.PrevButton>
					</Pagination.Item>
					{#each pages as page (page.key)}
						{#if page.type === 'ellipsis'}
							<Pagination.Item>
								<Pagination.Ellipsis />
							</Pagination.Item>
						{:else}
							<Pagination.Item>
								<Pagination.Link {page} isActive={currentPage === page.value}>
									{page.value}
								</Pagination.Link>
							</Pagination.Item>
						{/if}
					{/each}
					<Pagination.Item>
						<Pagination.NextButton>
							<span class="hidden sm:block">Next</span>
							<ChevronRight class="size-4" />
						</Pagination.NextButton>
					</Pagination.Item>
				</Pagination.Content>
			{/if}
		{/snippet}
	</Pagination.Root>
</div>
