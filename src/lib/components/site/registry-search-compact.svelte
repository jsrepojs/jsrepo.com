<script lang="ts">
	import { UseQuery } from '$lib/hooks/use-query.svelte.js';
	import { goto } from '$app/navigation';
	import { activeElement } from 'runed';
	import { cn } from '$lib/utils/utils';
	import { Download, LoaderCircle, Search } from '@lucide/svelte';
	import type { RegistryDetails } from '$lib/backend/db/functions';
	import { shortcut } from '$lib/actions/shortcut.svelte';

	type Props = {
		class?: string;
		search?: string;
		onSearch?: (search: string) => void;
	};

	let { search = $bindable(''), onSearch, class: className }: Props = $props();

	const id = $props.id();

	let ref = $state<HTMLInputElement>();

	const query = new UseQuery(
		async ({ signal }) => {
			if (search === '') {
				return [];
			}

			const response = await fetch(`/api/registries?limit=10&q=${search}`, {
				signal
			});

			if (!response.ok) return [];

			const result = (await response.json()) as { data: RegistryDetails[] };

			return result.data;
		},
		{ debounceMs: 10 }
	);

	const filteredCompletions = $derived(query.data ?? []);

	let selectedIndex = $state<number>();

	const isFocused = $derived(activeElement.current?.id === id || selectedIndex !== undefined);

	const canShowList = $derived(isFocused && search.length > 0 && filteredCompletions.length > 0);

	function handleKeydown(e: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		let length = filteredCompletions.length;

		if (length === 0) return;

		if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (selectedIndex === undefined) return;

			if (selectedIndex - 1 < 0) {
				return;
			}

			selectedIndex -= 1;

			return;
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();

			if (selectedIndex === undefined) {
				selectedIndex = 0;

				return;
			}

			if (selectedIndex + 1 > filteredCompletions.length - 1) {
				selectedIndex = 0;
			} else {
				selectedIndex += 1;
			}

			return;
		}

		if (e.key === 'Escape') {
			if (selectedIndex !== undefined) {
				selectedIndex = undefined;
			} else {
				ref?.blur();
			}
		}
	}

	async function handleSubmit() {
		if (selectedIndex === undefined) {
			if (onSearch !== undefined) {
				onSearch(search);
			} else {
				await goto(`/search?q=${search}`);
			}
		} else {
			const options = document.querySelectorAll(`[data-search-item]`);

			for (const option of options) {
				const index = parseInt(option.getAttribute('data-index') ?? '-1');

				if (index === selectedIndex) {
					const url = option.getAttribute('data-url');

					if (!url) return;

					await goto(url);
				}
			}
		}

		// reset completions so that they don't show on refresh
		query.data = [];
	}
</script>

<svelte:window
	onclick={(e) => {
		// if we click outside make sure we clear the selected index
		const target = e.target as HTMLElement | null;

		if (!target) return;

		if (!target.closest('[data-search-item]')) {
			selectedIndex = undefined;
		}
	}}
	use:shortcut={{ key: 'k', ctrl: true, preventDefault: true, callback: () => ref?.focus() }}
/>

<form
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
	class={cn('bg-popover flex h-9 w-full place-items-center text-base md:text-sm', className)}
>
	<div
		class="border-border focus-within:border-primary relative flex h-full w-full place-items-center rounded-l-lg border pl-3 transition-all"
	>
		<Search class="mr-2 size-4 shrink-0 opacity-50" />
		<input
			{id}
			bind:value={search}
			bind:this={ref}
			autocomplete="off"
			onclick={() => (selectedIndex = undefined)}
			oninput={query.runDB}
			onkeydown={handleKeydown}
			class="placeholder:text-muted-foreground h-full w-full min-w-0 bg-transparent py-3 outline-none disabled:cursor-not-allowed disabled:opacity-50"
			placeholder="Search registries..."
		/>
		<div class="absolute top-0 right-0 flex h-9 place-items-center gap-2">
			{#if query.loading}
				<div class="flex size-full w-12 place-items-center justify-center">
					<LoaderCircle class="text-muted-foreground size-4 shrink-0 animate-spin" />
				</div>
			{/if}
			{#if query.error}
				<div class="text-destructive flex size-full w-12 place-items-center justify-center">!</div>
			{/if}
		</div>
		{#if canShowList}
			<div class="border-border bg-popover absolute top-10 left-0 z-10 w-full rounded-lg border">
				<!-- Group -->
				<div class="text-foreground overflow-hidden p-1">
					{#each filteredCompletions as registry, i (registry)}
						{@const name = `@${registry.scope.name}/${registry.name}`}
						<!-- svelte-ignore a11y_mouse_events_have_key_events -->
						<!-- svelte-ignore a11y_role_supports_aria_props_implicit -->
						<button
							type="submit"
							class="aria-selected:bg-accent aria-selected:text-accent-foreground relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-start text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
							aria-selected={selectedIndex === i}
							onmouseover={() => (selectedIndex = i)}
							tabindex={-1}
							data-search-item
							data-index={i}
							data-url="/{name}"
						>
							<div class="flex flex-col">
								<span class="text-lg font-medium">{name}</span>
								<span class="text-muted-foreground">
									{registry.metaDescription}
								</span>
							</div>
							<span class="text-muted-foreground flex items-center gap-2 font-mono text-sm">
								{registry.monthlyFetches}
								<Download class="inline size-4" />
							</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
	<button
		type="submit"
		class="border-primary bg-primary text-primary-foreground h-full cursor-pointer rounded-r-lg border px-4"
	>
		<Search class="size-4" />
	</button>
</form>
