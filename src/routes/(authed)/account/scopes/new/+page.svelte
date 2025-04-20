<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { superForm } from 'sveltekit-superforms/client';
	import * as Form from '$lib/components/ui/form';
	import { ChevronLeft } from '@lucide/svelte';

	let { data } = $props();

	let error = $state<string>();

	const form = superForm(data.form, {
		onError: ({ result }) => {
			error = result.error.message;
		}
	});

	const { enhance, submitting, form: formData } = form;

	const canSubmit = $derived($formData.name.length > 0);
</script>

<svelte:head>
	<title>New - Scopes - Account - jsrepo</title>
</svelte:head>

<form method="POST" use:enhance class="flex flex-col gap-2">
	<a
		href="/account/scopes"
		class="flex place-items-center gap-2 text-muted-foreground transition-all hover:text-foreground"
	>
		<ChevronLeft />
		Back to Scopes
	</a>
	<h1 class="text-2xl font-bold">New Scope</h1>
	<Form.Field {form} name="name">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Name</Form.Label>
				<div class="relative">
					<span class="absolute top-1/2 -translate-y-1/2 left-2">@</span>
					<Input {...props} bind:value={$formData.name} placeholder="Name" class="pl-5" />
				</div>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Button loading={$submitting} disabled={!canSubmit}>Create</Form.Button>
	{#if error}
		<span class="text-sm text-destructive">{error}</span>
	{/if}
</form>
