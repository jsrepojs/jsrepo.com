<script lang="ts">
	import * as Nav from '$lib/components/site/nav';
	import { Meter } from '$lib/components/ui/meter';
	import { ChevronLeft } from '@lucide/svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Scopes - Account - jsrepo</title>
</svelte:head>

<div class="flex flex-col gap-4">
	<a
		href="/account"
		class="flex place-items-center gap-2 text-muted-foreground transition-all hover:text-foreground"
	>
		<ChevronLeft />
		Back to Account
	</a>
	<div class="flex flex-col gap-2">
		<div class="flex place-items-center justify-between">
			<Nav.Title>Your Scopes</Nav.Title>
			<span class="text-sm text-muted-foreground">{data.scopes.userScopes.length} / 3</span>
		</div>
		<Meter min={0} max={3} value={data.scopes.userScopes.length} />
	</div>
	<div class="flex flex-col gap-2">
		<ul class="flex flex-col gap-2">
			{#each data.scopes.userScopes as scope (scope.id)}
				<li
					class="relative flex place-items-center justify-between rounded-lg border bg-card p-4 transition-all hover:bg-accent"
				>
					<a href="/@{scope.name}" class="text-lg font-medium">
						<span class="absolute inset-0"></span>
						@{scope.name}
					</a>
				</li>
			{/each}
		</ul>
	</div>
	<div class="flex flex-col gap-2">
		<Nav.Title>Organization Scopes</Nav.Title>
		<ul class="flex flex-col gap-2">
			{#each data.scopes.orgScopes as scope (scope.scope.id)}
				<li
					class="relative flex place-items-center justify-between rounded-lg border bg-card p-4 transition-all hover:bg-accent"
				>
					<a href="/@{scope.scope.name}" class="text-lg font-medium">
						<span class="absolute inset-0"></span>
						@{scope.scope.name}
					</a>
				</li>
			{/each}
		</ul>
	</div>
</div>
