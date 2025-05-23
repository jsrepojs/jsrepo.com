<script lang="ts">
	import { authClient } from '$lib/auth/client';

	async function exec() {
		const application = await authClient.oauth2.register({
			client_name: 'jsrepo CLI',
			redirect_uris: ['http://localhost:3333/callback']
		});

		console.log(application);
	}
</script>

<button onclick={exec}>
    click me
</button>
