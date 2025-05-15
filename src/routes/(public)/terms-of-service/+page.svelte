<script lang="ts">
	import { MetaTags } from '$lib/components/site/meta-tags';
	import '../../../markdown.css';

	let { data } = $props();
</script>

<MetaTags title="Terms of Service" />

<div class="flex w-full flex-col place-items-center">
	<div class="flex w-full max-w-4xl flex-col gap-8">
		<div class="pt-20">
			<h1 class="text-center text-5xl font-bold">Terms of Service for jsrepo.com</h1>
			<p class="text-center text-lg text-muted-foreground">
				Below are the terms and conditions you accept by using jsrepo.com.
			</p>
		</div>
		<div class="w-full py-4">
			<div class="prose col-start-2 flex w-full flex-col px-4">
				{@html data.tos}
			</div>
		</div>
	</div>
</div>
