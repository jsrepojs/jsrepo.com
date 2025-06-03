<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { Separator } from '$lib/components/ui/separator';
	import { getInitials } from '$lib/ts/initials';
	import * as Tabs from '$lib/components/site/tabs';
	import { page } from '$app/state';
	import * as List from '$lib/components/site/list';
	import { MetaTags } from '$lib/components/site/meta-tags/index.js';

	let { data } = $props();

	const tab = $derived(page.url.searchParams.get('tab') ?? '/');
</script>

<MetaTags title="{data.user.username} - jsrepo" />

<div class="flex min-h-[calc(100svh-var(--header-height))] flex-col gap-4 pt-10 pb-4">
	<div class="grid grid-cols-1 place-items-start gap-4 md:grid-cols-[8rem_1fr] md:gap-8">
		<div
			class="col-start-1 flex flex-row place-items-center justify-start gap-2 md:flex-col md:justify-center"
		>
			<Avatar.Root class="size-24 md:size-32">
				<Avatar.Image src={data.user.image} />
				<Avatar.Fallback>{getInitials(data.user.name)}</Avatar.Fallback>
			</Avatar.Root>
			<div class="flex flex-col md:place-items-center">
				<span class="max-w-full truncate text-start text-xl font-medium md:text-center">
					{data.user.username}
				</span>
			</div>
		</div>
		<Separator class="md:hidden" />
		<div class="w-full md:col-start-2">
			<Tabs.Root>
				<Tabs.Tab href="?tab=/" isSearch tag={data.registries.total.toString()}>
					Registries
				</Tabs.Tab>
				<Tabs.Tab href="?tab=organizations" isSearch tag={data.orgs.length.toString()}>
					Organizations
				</Tabs.Tab>
			</Tabs.Root>
			<div class="py-2">
				{#if tab === '/'}
					<List.Root>
						<List.List>
							{#each data.registries.data as registry (registry.id)}
								<List.Registry {registry} />
							{/each}
						</List.List>
					</List.Root>
				{:else if tab === 'organizations'}
					<List.Root>
						<List.List>
							{#each data.orgs as org (org.id)}
								<List.Item>
									<List.Link href="/{org.name}">
										{org.name}
									</List.Link>
								</List.Item>
							{/each}
						</List.List>
					</List.Root>
				{/if}
			</div>
		</div>
	</div>
</div>
