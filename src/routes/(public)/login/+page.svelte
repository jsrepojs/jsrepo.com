<script lang="ts">
	import * as Auth from '$lib/auth/components';
</script>

<svelte:head>
	<title>Log in - jsrepo</title>
</svelte:head>

<div class="flex flex-col place-items-center justify-center h-[calc(100svh-var(--header-height)]">
	
	<div class="max-w-sm w-full flex flex-col gap-4 mt-[25svh]">
		<h1 class="font-mono font-bold text-5xl text-center">
			jsrepo
		</h1>
		<span class="text-muted-foreground text-lg	 text-center">
			Log in to start distributing your code.
		</span>
		<Auth.GitHubButton />
	</div>
</div>
