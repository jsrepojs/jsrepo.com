<script lang="ts">
    import * as Auth from '$lib/auth/components'
</script>

<div class="flex h-full justify-center relative container">
	<div class="flex w-full max-w-xs sm:max-w-sm flex-col gap-4 sm:gap-8 mt-[25svh]">
        <div class="flex flex-col">
            <h1 class="text-3xl sm:text-5xl font-bold text-center">Log in to jsrepo</h1>
        </div>
        <Auth.GitHubButton/>
	</div>
</div>
