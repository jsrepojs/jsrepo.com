<script lang="ts">
	import * as Auth from '$lib/auth/components';
</script>

<svelte:head>
	<title>Log in - jsrepo</title>
</svelte:head>

<div class="h-[calc(100svh-var(--header-height)] flex flex-col place-items-center justify-center">
	<div class="mt-[25svh] flex w-full max-w-sm flex-col gap-4">
		<h1 class="text-center font-mono text-5xl font-bold">jsrepo</h1>
		<span class="text-center text-lg text-muted-foreground">
			Log in to start distributing your code.
		</span>
		<Auth.GitHubButton />
	</div>
</div>
