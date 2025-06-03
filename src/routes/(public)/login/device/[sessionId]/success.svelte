<script lang="ts">
	import BlurFade from '$lib/components/animation/blur-fade.svelte';
</script>

<div class="flex max-w-sm flex-col place-items-center justify-center gap-2">
	<BlurFade>
		<h1 class="text-center text-6xl font-bold">Success!</h1>
	</BlurFade>
	<BlurFade delay={200 / 1000}>
		<p class="text-muted-foreground text-center text-lg">
			You can safely close this tab and go back to your device!
		</p>
	</BlurFade>
</div>
