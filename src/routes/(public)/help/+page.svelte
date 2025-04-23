<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { superForm } from 'sveltekit-superforms/client';
	import * as Form from '$lib/components/ui/form';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { page } from '$app/state';
	import { SUPPORT_REASONS } from '$lib/ts/help.js';

	let { data } = $props();

	let error = $state<string>();

	const form = superForm(data.form, {
		onError: ({ result }) => {
			error = result.error.message;
		}
	});

	const { enhance, submitting, form: formData } = form;

	function getReason(reason: string | null): { label: string; value: string } | null {
		if (reason === null) return null;

		return (
			Object.entries(SUPPORT_REASONS)
				.flatMap(([_, value]) =>
					Object.entries(value).flatMap(([value, label]) => ({ label, value }))
				)
				.find((o) => o.value === reason) ?? null
		);
	}

	$formData.name = data.session?.user.name ?? '';
	$formData.email = data.session?.user.email ?? '';
	$formData.subject = page.url.searchParams.get('subject') ?? '';
	$formData.reason = getReason(page.url.searchParams.get('reason'))?.value ?? '';

	const canSubmit = $derived(
		$formData.email.length > 0 &&
			$formData.name.length > 0 &&
			$formData.subject.length > 0 &&
			$formData.reason.length > 0 &&
			$formData.body.length > 0
	);
</script>

<svelte:head>
	<title>Help - jsrepo</title>
</svelte:head>

<div class="flex min-h-[calc(100svh-var(--header-height))] flex-col place-items-center gap-4 py-6">
	<h1 class="mt-[15svh] text-center text-5xl font-bold">Get Support</h1>
	<form method="POST" use:enhance class="w-full max-w-sm">
		<Form.Field {form} name="name">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>Name</Form.Label>
					<Input
						{...props}
						bind:value={$formData.name}
						placeholder="Name"
						readonly={data.session !== null}
					/>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
		<Form.Field {form} name="email">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>Email</Form.Label>
					<Input
						{...props}
						bind:value={$formData.email}
						placeholder="Email"
						readonly={data.session !== null}
					/>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
		<Form.Field {form} name="reason">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>Reason</Form.Label>
					<Select.Root {...props} type="single" bind:value={$formData.reason}>
						<Select.Trigger>
							<span>
								{getReason($formData.reason)?.label ?? 'Reason'}
							</span>
						</Select.Trigger>
						<Select.Content>
							{#each Object.entries(SUPPORT_REASONS) as [group, reasons]}
								<Select.Group>
									<Select.GroupHeading>{group}</Select.GroupHeading>
									{#each Object.entries(reasons) as [value, label] (value)}
										<Select.Item {value} {label} />
									{/each}
								</Select.Group>
							{/each}
						</Select.Content>
					</Select.Root>
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
		<Form.Field {form} name="subject">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>Subject</Form.Label>
					<Input {...props} bind:value={$formData.subject} placeholder="Subject" />
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
		<Form.Field {form} name="body">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>Body</Form.Label>
					<Textarea {...props} bind:value={$formData.body} placeholder="Body" />
				{/snippet}
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
		<Form.Button loading={$submitting} disabled={!canSubmit} class="w-full">Get Support</Form.Button
		>
		{#if error}
			<span class="text-sm text-destructive">{error}</span>
		{/if}
	</form>
</div>
