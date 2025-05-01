<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { superForm } from 'sveltekit-superforms/client';
	import * as Form from '$lib/components/ui/form';
	import { ChevronLeft } from '@lucide/svelte';
	import { generateSlug } from 'random-word-slugs';
	import { NAME_REGEX } from '$lib/ts/registry/name.js';
	import { page } from '$app/state';
	import * as Select from '$lib/components/ui/select';

	let { data } = $props();

	let error = $state<string>();

	const form = superForm(data.form, {
		onError: ({ result }) => {
			error = result.error.message;
		}
	});

	const { enhance, submitting, form: formData } = form;

	const nameInvalid = $derived($formData.name.match(NAME_REGEX) === null);
	const canSubmit = $derived($formData.name.length > 0 && !nameInvalid);

	const placeholder = generateSlug(2, {
		categories: { noun: ['animals', 'science', 'transportation', 'thing', 'food', 'profession'] }
	});

	// prevent invalid orgs
	$formData.org =
		data.orgs.find((o) => o.org.name === (page.url.searchParams.get('org') ?? ''))?.org.name ?? '';
</script>

<svelte:head>
	<title>New - Scopes - Account - jsrepo</title>
</svelte:head>

<form method="POST" use:enhance class="flex flex-col gap-2">
	<a
		href="/account/scopes"
		class="flex place-items-center gap-2 py-2 text-muted-foreground transition-all hover:text-foreground"
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
					<span class="absolute left-2 top-1/2 -translate-y-1/2 text-base md:left-2.5 md:text-sm">
						@
					</span>
					<Input
						{...props}
						aria-invalid={nameInvalid}
						oninput={() => {
							$formData.name = $formData.name.replace(/[^-a-z0-9]/gi, '');
						}}
						maxlength={20}
						bind:value={$formData.name}
						{placeholder}
						class="pl-5 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive"
					/>
				</div>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="org">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>Org</Form.Label>
				<Select.Root type="single" {...props} bind:value={$formData.org}>
					<Select.Trigger>
						{$formData.org === '' ? '--' : $formData.org}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">--</Select.Item>
						{#each data.orgs as org (org.org.id)}
							<Select.Item value={org.org.name}>{org.org.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			{/snippet}
		</Form.Control>
	</Form.Field>
	<Form.Button loading={$submitting} disabled={!canSubmit}>Create</Form.Button>
	{#if error}
		<span class="text-sm text-destructive">{error}</span>
	{/if}
</form>
