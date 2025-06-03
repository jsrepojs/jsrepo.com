<script lang="ts">
	import * as Tabs from '$lib/components/site/tabs';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Popover from '$lib/components/ui/popover';
	import { cn } from '$lib/utils/utils';
	import { Ellipsis } from '@lucide/svelte';

	let { data, children } = $props();

	let tabListPopoverOpen = $state(false);
</script>

<div class="flex flex-col py-6">
	<div class="flex flex-col gap-2">
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>Organizations</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Page>{data.org.name}</Breadcrumb.Page>
			</Breadcrumb.List>
		</Breadcrumb.Root>
		<div class="flex flex-col gap-1">
			<h1 class="text-4xl font-bold">{data.org.name}</h1>
			{#if data.org.description}
				<p class="text-muted-foreground">{data.org.description}</p>
			{/if}
		</div>
		<Tabs.Root class="flex place-items-end justify-between">
			<div class="flex place-items-end">
				<!-- <Tabs.Tab href="/{data.org.name}" activeForSubdirectories={false}>Home</Tabs.Tab> -->
				<Tabs.Tab href="/{data.org.name}/registries">Registries</Tabs.Tab>
				<Tabs.Tab href="/{data.org.name}/scopes">Scopes</Tabs.Tab>
				<Tabs.Tab
					href="/{data.org.name}/members"
					tag={data.org.members.length.toString()}
					class="hidden sm:flex"
				>
					Members
				</Tabs.Tab>
				{#if data.member}
					<Tabs.Tab href="/{data.org.name}/settings" class="hidden sm:flex">Settings</Tabs.Tab>
				{/if}
			</div>
			<Popover.Root bind:open={tabListPopoverOpen}>
				<Popover.Trigger
					class={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mb-1 sm:hidden')}
				>
					<Ellipsis />
				</Popover.Trigger>
				<Popover.Content class="w-48 p-0" align="end">
					<div class="flex flex-col p-1">
						<a
							href="/{data.org.name}/members"
							onclick={() => (tabListPopoverOpen = false)}
							class="flex place-items-center gap-2 rounded-md px-3 py-2 text-base/(--line-height) hover:bg-accent"
							style="--line-height: 24px;"
						>
							Members
							<div class="flex h-(--line-height) place-items-center justify-center">
								<div
									class="flex size-6 place-items-center justify-center rounded-full bg-primary font-mono text-sm text-primary-foreground"
								>
									{data.org.members.length.toString()}
								</div>
							</div>
						</a>
						<a
							href="/{data.org.name}/settings"
							onclick={() => (tabListPopoverOpen = false)}
							class="flex place-items-center gap-2 rounded-md px-3 py-2 text-base/(--line-height) hover:bg-accent"
							style="--line-height: 24px;"
						>
							Settings
						</a>
					</div>
				</Popover.Content>
			</Popover.Root>
		</Tabs.Root>
	</div>
	<div class="w-full py-2">
		{@render children()}
	</div>
</div>
