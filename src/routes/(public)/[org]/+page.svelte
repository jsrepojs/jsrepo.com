<script lang="ts">
	import { MetaTags } from '$lib/components/site/meta-tags/index.js';

	let { data } = $props();
</script>

<MetaTags title="{data.org.name} - jsrepo"/>\

<div class="grid grid-cols-[1fr_16rem]">
	<div></div>
	<div class="col-start-2"></div>
</div>
