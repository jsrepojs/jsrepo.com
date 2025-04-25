<script lang="ts">
	import RegistrySearch from '$lib/components/site/registry-search.svelte';
	import * as List from '$lib/components/site/list';
	import * as Pagination from '$lib/components/ui/pagination';
	import { queryParameters } from 'sveltekit-search-params';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';

	let { data } = $props();

	const params = queryParameters();

	let page = $state($params.page ?? 1);
</script>

<svelte:head>
	<title>Search Registries - jsrepo</title>
</svelte:head>

<div class="flex flex-col gap-2 py-2">
	<RegistrySearch search={data.query} />
	<List.Root>
		<List.List>
			{#each data.registries as registry (registry.id)}
				<List.Registry {registry} />
			{/each}
		</List.List>
	</List.Root>
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
