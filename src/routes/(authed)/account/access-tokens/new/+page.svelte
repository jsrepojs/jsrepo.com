<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { superForm } from 'sveltekit-superforms/client';
	import * as Form from '$lib/components/ui/form';
	import { newTokenContext } from '$lib/context.svelte.js';
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth/client.js';
	import { onMount } from 'svelte';
	import { Check, ChevronLeft, X } from '@lucide/svelte';

	let { data } = $props();

	const newKeyCtx = newTokenContext.get();

	let error = $state<string>();
	let apiKeys = $state<Set<string>>(new Set([]));

	const form = superForm(data.form, {
		onResult: async ({ result }) => {
			if (result.type === 'success') {
				newKeyCtx.current = {
					id: result.data?.form.message.id,
					key: result.data?.form.message.key
				};
				await goto('/account/access-tokens');
			}
		},
		onError: ({ result }) => {
			error = result.error.message;
		}
	});

	const { enhance, submitting, form: formData } = form;

	const hasName = $derived(apiKeys.has($formData.name));
	const canSubmit = $derived(!hasName && $formData.name.length > 0);

	onMount(async () => {
		const keys = await authClient.apiKey.list();

		if (keys.data) {
			apiKeys = new Set(keys.data.map((k) => k.name ?? ''));
		}
	});
</script>

<svelte:head>
	<title>New - Access Tokens - Account - jsrepo</title>
</svelte:head>

<form method="POST" use:enhance class="flex flex-col gap-2">
	<a
		href="/account/access-tokens"
		class="flex place-items-center gap-2 text-muted-foreground transition-all hover:text-foreground"
	>
		<ChevronLeft />
		Back to Access Tokens
	</a>
	<h1 class="text-2xl font-bold">New Access Token</h1>
	<Form.Field {form} name="name">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Name</Form.Label>
				<div class="relative">
					<Input {...props} bind:value={$formData.name} placeholder="Name" />
					{#if hasName}
						<X class="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-destructive" />
					{:else if $formData.name.length > 0}
						<Check class="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-green-500" />
					{/if}
				</div>
			{/snippet}
		</Form.Control>
		<Form.Description>Name to identify the access token.</Form.Description>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Button loading={$submitting} disabled={!canSubmit}>Create</Form.Button>
	{#if error}
		<span class="text-sm text-destructive">{error}</span>
	{/if}
</form>
