<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as InputOTP from '$lib/components/ui/input-otp';
	import { superForm } from 'sveltekit-superforms';
	import * as Form from '$lib/components/ui/form';
	import Success from './success.svelte';
	import { UseQuery } from '$lib/hooks/use-query.svelte';
	import { page } from '$app/state';
	import { LoaderCircle } from '@lucide/svelte';
	import { MetaTags } from '$lib/components/site/meta-tags';

	let { data } = $props();

	let error = $state<string>();

	const form = superForm(data.form, {
		onError: ({ result }) => {
			error = result.error.message;
		}
	});

	const { enhance, submitting, form: formData } = form;

	const resendCodeQuery = new UseQuery(async () => {
		const response = await fetch(`/api/login/device/${page.params.sessionId}/resend-code`, {
			method: 'POST',
			headers: { 'content-type': 'applications/json' }
		});

		return response.ok;
	});
</script>

<MetaTags title="Device Authorization - jsrepo" />

<div
	class="flex min-h-[calc(100svh-var(--header-height))] flex-col place-items-center justify-center gap-2"
>
	{#if data.expires.valueOf() < Date.now()}
		<h1 class="text-center font-mono text-7xl font-bold">Too Late!</h1>
		<p class="text-center text-muted-foreground">
			You're too late! Your session has expired. Please try again (with some haste this time).
		</p>
	{:else if !data.hasSentCode}
		<div>
			<Button>Send a Code</Button>
		</div>
	{:else if data.success}
		<Success />
	{:else}
		<form
			method="POST"
			use:enhance
			class="flex flex-col place-items-center gap-4 rounded-lg border border-border p-6 md:bg-card"
		>
			<div class="flex flex-col">
				<h1 class="text-center text-3xl font-bold">Device Login</h1>
				<span class="text-center text-muted-foreground">
					Enter the code in your email to authenticate your device.
				</span>
			</div>
			<Form.Field {form} name="code">
				<Form.Control>
					{#snippet children({ props })}
						<InputOTP.Root {...props} maxlength={6} bind:value={$formData.code}>
							{#snippet children({ cells })}
								<InputOTP.Group>
									{#each cells.slice(0, 3) as cell (cell)}
										<InputOTP.Slot {cell} class="size-10" />
									{/each}
								</InputOTP.Group>
								<InputOTP.Separator />
								<InputOTP.Group>
									{#each cells.slice(3, 6) as cell (cell)}
										<InputOTP.Slot {cell} class="size-10" />
									{/each}
								</InputOTP.Group>
							{/snippet}
						</InputOTP.Root>
					{/snippet}
				</Form.Control>
			</Form.Field>
			<div class="flex w-full flex-col place-items-center gap-2">
				<Form.Button class="w-full" loading={$submitting} disabled={$formData.code.length !== 6}>
					Continue
				</Form.Button>
				<span class="text-start text-sm">
					Didn't work?
					<button
						onclick={resendCodeQuery.run}
						class="inline-flex place-items-center gap-1 font-medium"
					>
						Resend code
						{#if resendCodeQuery.loading}
							<div class="inlin-flex animate-spin place-items-center justify-center">
								<LoaderCircle class="inline size-3" />
							</div>
						{/if}
					</button>
				</span>
				{#if error}
					<span class="text-sm text-destructive">{error}</span>
				{/if}
			</div>
		</form>
	{/if}
</div>
