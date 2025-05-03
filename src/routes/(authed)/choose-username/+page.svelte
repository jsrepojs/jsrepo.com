<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { superForm } from 'sveltekit-superforms/client';
	import * as Form from '$lib/components/ui/form';
	import { Check, X } from '@lucide/svelte';
	import { NAME_REGEX } from '$lib/ts/registry/name.js';
	import { UseQuery } from '$lib/hooks/use-query.svelte.js';

	let { data } = $props();

	let error = $state<string>();

	const form = superForm(data.form, {
		onError: ({ result }) => {
			error = result.error.message;
		}
	});

	const { enhance, submitting, form: formData } = form;

	const searchUserOrOrgQuery = new UseQuery(
		async ({ signal }) => {
			if (nameInvalid) return undefined;

			const name = $formData.username.trim();

			if (name.length === 0) {
				return undefined;
			}

			const response = await fetch(`/api/functions/user-or-org?search=${name}`, { signal });

			return response.ok;
		},
		{ invalidateOnCall: true, debounceMs: 100 }
	);

	const nameInvalid = $derived($formData.username.match(NAME_REGEX) === null);
	const canSubmit = $derived(
		$formData.username.length > 0 &&
			!nameInvalid &&
			(searchUserOrOrgQuery.data === undefined || !searchUserOrOrgQuery.data)
	);
</script>

<svelte:head>
	<title>Choose your Username - jsrepo</title>
</svelte:head>

<form method="POST" use:enhance class="flex flex-col gap-2">
	<Form.Field {form} name="username">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Username</Form.Label>
				<div class="relative">
					<Input
						{...props}
						aria-invalid={nameInvalid}
						oninput={() => {
							$formData.username = $formData.username.replace(/[^-a-z0-9]/gi, '');
							searchUserOrOrgQuery.runDB();
						}}
						maxlength={50}
						bind:value={$formData.username}
						class="aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive"
					/>
					{#if searchUserOrOrgQuery.data !== undefined}
						{#if searchUserOrOrgQuery.data}
							<X class="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-destructive" />
						{:else if $formData.username.length > 0}
							<Check class="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-green-500" />
						{/if}
					{/if}
				</div>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Button loading={$submitting} disabled={!canSubmit}>Continue</Form.Button>
	{#if error}
		<span class="text-sm text-destructive">{error}</span>
	{/if}
</form>
