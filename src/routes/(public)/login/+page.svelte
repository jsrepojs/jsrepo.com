<script lang="ts">
	import * as Auth from '$lib/auth/components';
</script>

<div class="container relative flex h-full justify-center">
	<div class="mt-[25svh] flex w-full max-w-xs flex-col gap-4 sm:max-w-sm sm:gap-8">
		<div class="flex flex-col">
			<h1 class="text-center text-3xl font-bold sm:text-5xl">Log in to jsrepo</h1>
		</div>
		<Auth.GitHubButton />
	</div>
</div>
