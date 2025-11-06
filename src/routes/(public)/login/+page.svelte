<script lang="ts">
	import * as Auth from '$lib/auth/components';
	import { MetaTags } from '$lib/components/site/meta-tags';
</script>

<MetaTags title="Log in - jsrepo" />

<div class="flex h-[calc(100svh-var(--header-height))] flex-col place-items-center justify-center">
	<Auth.GitHubButton />
</div>
