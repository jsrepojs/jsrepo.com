<script lang="ts">
	import * as Icons from '$lib/components/icons';
	import Button from './signin-button.svelte';
	import { signIn } from './utils';
</script>

<Button onclick={() => signIn('github')}>
	<Icons.GitHub />
</Button>
