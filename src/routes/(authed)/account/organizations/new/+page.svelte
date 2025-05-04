<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { superForm } from 'sveltekit-superforms/client';
	import * as Form from '$lib/components/ui/form';
	import { Check, ChevronLeft, X } from '@lucide/svelte';
	import { generateSlug } from 'random-word-slugs';
	import { NAME_REGEX } from '$lib/ts/registry/name.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { UseQuery } from '$lib/hooks/use-query.svelte.js';

	let { data } = $props();

	let error = $state<string>();

	const form = superForm(data.form, {
		onError: ({ result }) => {
			error = result.error.message;
		}
	});

	const { enhance, submitting, form: formData } = form;

	const placeholder = generateSlug(2, {
		categories: { noun: ['animals', 'science', 'transportation', 'thing', 'food', 'profession'] }
	});

	const searchUserOrOrgQuery = new UseQuery(
		async ({ signal }) => {
			if (nameInvalid) return undefined;

			const name = $formData.name.trim();

			if (name.length === 0) {
				return undefined;
			}

			const response = await fetch(`/api/functions/user-or-org?search=${name}`, { signal });

			return response.ok;
		},
		{ invalidateOnCall: true, debounceMs: 100 }
	);

	const nameInvalid = $derived($formData.name.match(NAME_REGEX) === null);
	const canSubmit = $derived(
		$formData.name.length > 0 &&
			!nameInvalid &&
			(searchUserOrOrgQuery.data === undefined || !searchUserOrOrgQuery.data)
	);
</script>

<svelte:head>
	<title>New - Organizations - Account - jsrepo</title>
</svelte:head>

<form method="POST" use:enhance class="flex flex-col gap-2">
	<a
		href="/account/organizations"
		class="flex place-items-center gap-2 py-2 text-muted-foreground transition-all hover:text-foreground"
	>
		<ChevronLeft />
		Back to Organizations
	</a>
	<h1 class="text-2xl font-bold">New Organization</h1>
	<Form.Field {form} name="name">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Name</Form.Label>
				<div class="relative">
					<Input
						{...props}
						aria-invalid={nameInvalid}
						oninput={() => {
							$formData.name = $formData.name.replace(/[^-a-z0-9]/gi, '');
							searchUserOrOrgQuery.runDB();
						}}
						maxlength={50}
						bind:value={$formData.name}
						{placeholder}
						class="aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive"
					/>
					{#if searchUserOrOrgQuery.data !== undefined}
						{#if searchUserOrOrgQuery.data}
							<X class="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-destructive" />
						{:else if $formData.name.length > 0}
							<Check class="absolute right-2 top-1/2 size-3 -translate-y-1/2 text-green-500" />
						{/if}
					{/if}
				</div>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="description">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Description (optional)</Form.Label>
				<Textarea
					{...props}
					bind:value={$formData.description}
					placeholder="Whats your organization all about..."
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Button loading={$submitting} disabled={!canSubmit}>Create</Form.Button>
	{#if error}
		<span class="text-sm text-destructive">{error}</span>
	{/if}
</form>
