<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { superForm } from 'sveltekit-superforms/client';
	import * as Form from '$lib/components/ui/form';
	import { Check, X } from '@lucide/svelte';
	import { NAME_REGEX } from '$lib/ts/registry/name.js';
	import { UseQuery } from '$lib/hooks/use-query.svelte.js';
	import { MetaTags } from '$lib/components/site/meta-tags';

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

<MetaTags title="Choose your Username - jsrepo" />

<div class="flex min-h-[calc(100svh-var(--header-height))] place-items-center justify-center">
	<form method="POST" use:enhance class="flex w-full max-w-xs flex-col place-items-center gap-2">
		<div>
			<h1 class="text-center text-2xl font-bold">Choose a username</h1>
			<p class="text-muted-foreground text-center">Before you continue choose a username.</p>
		</div>
		<Form.Field {form} name="username" class="w-full">
			<Form.Control>
				{#snippet children({ props })}
					<div class="relative w-full">
						<Input
							{...props}
							aria-invalid={nameInvalid}
							oninput={() => {
								$formData.username = $formData.username.replace(/[^-a-z0-9]/gi, '');
								searchUserOrOrgQuery.runDB();
							}}
							placeholder="Username"
							maxlength={50}
							bind:value={$formData.username}
							class="aria-invalid:border-destructive aria-invalid:ring-destructive w-full"
						/>
						{#if searchUserOrOrgQuery.data !== undefined}
							{#if searchUserOrOrgQuery.data}
								<X class="text-destructive absolute top-1/2 right-2 size-3 -translate-y-1/2" />
							{:else if $formData.username.length > 0}
								<Check class="absolute top-1/2 right-2 size-3 -translate-y-1/2 text-green-500" />
							{/if}
						{/if}
					</div>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
		<Form.Button loading={$submitting} disabled={!canSubmit} class="w-full">Continue</Form.Button>
		{#if error}
			<span class="text-destructive text-sm">{error}</span>
		{/if}
	</form>
</div>
