<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Snippet } from '$lib/components/ui/snippet';
	import { superForm } from 'sveltekit-superforms/client';
	import * as Form from '$lib/components/ui/form';

	let { data } = $props();

	const form = superForm(data.form);

	const { enhance, submitting, form: formData, message } = form;

	let key = $state<string>();

	$inspect($message);
</script>

<form method="POST" use:enhance class="flex flex-col gap-2">
	<Form.Field {form} name="name">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Email</Form.Label>
				<Input {...props} bind:value={$formData.name} />
			{/snippet}
		</Form.Control>
		<Form.Description>Name given to the API key</Form.Description>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Button loading={$submitting}>Create API Key</Form.Button>
</form>
{#if $message?.key}
	<Snippet text={$message.key} />
{/if}
